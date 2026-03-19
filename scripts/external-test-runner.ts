import { Client } from '@elastic/elasticsearch';
import yaml from 'js-yaml';
import path from 'path';
import { glob } from 'glob';
import * as fsp from 'fs/promises';

const client = new Client({
  node: 'http://localhost:19200',
});

interface TestResult {
  file: string;
  test: string;
  status: 'passed' | 'failed';
  error?: string;
}

const allResults: TestResult[] = [];
const variables: Record<string, any> = {};

function toCamelCase(str: string) {
  // handle namespaces like cat.shards
  return str.replace(/(_|\.)([a-z])/g, (g) => g[1].toUpperCase());
}

function replaceVariables(obj: any): any {
  if (typeof obj === 'string') {
    if (obj.startsWith('$')) {
      const varName = obj.substring(1);
      if (variables[varName] !== undefined) {
        return variables[varName];
      }
    }
    // Replace $var inside string
    let result = obj;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`$${key}`, value);
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map(replaceVariables);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = replaceVariables(value);
    }
    return newObj;
  }
  return obj;
}

async function runStep(step: any) {
  if (step.do) {
    const actionKey = Object.keys(step.do)[0];
    let params = step.do[actionKey];

    // Handle ignore parameter
    let ignoreCodes: number[] = [];
    if (params && params.ignore) {
      ignoreCodes = Array.isArray(params.ignore) ? params.ignore : [params.ignore];
      delete params.ignore;
    }

    params = replaceVariables(params);

    const parts = actionKey.split('.');
    let target: any = client;
    for (let i = 0; i < parts.length - 1; i++) {
      const namespace = toCamelCase(parts[i]);
      if (!target[namespace]) {
        throw new Error(`Client namespace not found: ${parts[i]} (as ${namespace})`);
      }
      target = target[namespace];
    }
    const rawMethod = parts[parts.length - 1];
    let method = toCamelCase(rawMethod);

    // Special cases
    if (method === 'index' && typeof target.index !== 'function') {
      method = 'index'; // Direct index call
    }
    if (actionKey === 'indices.resolve_index' && typeof target.resolveIndex === 'function') {
      method = 'resolveIndex';
    }

    if (typeof target[method] !== 'function' && typeof target[rawMethod] === 'function') {
      method = rawMethod;
    }

    if (typeof target[method] !== 'function') {
      throw new Error(`Client method not found: ${actionKey} (as ${method})`);
    }

    try {
      const response = await target[method](params);
      return response;
    } catch (e: any) {
      if (ignoreCodes.includes(e.meta?.statusCode)) {
        return e.meta;
      }
      if (step.do.catch) {
        return e;
      }
      throw e;
    }
  }
  return null;
}

function getValueByPath(obj: any, path: string): any {
  if (!obj) return undefined;
  if (path === '$body' || path === '') return obj.body || obj;

  // Try exact path at root first
  if (obj[path] !== undefined) return obj[path];

  const data = obj.body || obj;
  // Try exact path in body
  if (data && data[path] !== undefined) return data[path];

  // Nested path traversal
  const parts = path.split('.');
  let current = data;
  for (const part of parts) {
    if (current === undefined || current === null) {
      // Maybe it was at root?
      if (current === data && obj[part] !== undefined) {
        current = obj[part];
        continue;
      }
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function assertMatch(actual: any, expected: any, path: string = '') {
  expected = replaceVariables(expected);

  if (typeof expected === 'string' && expected.startsWith('/') && expected.endsWith('/')) {
    const regexStr = expected.substring(1, expected.length - 1);
    const regex = new RegExp(regexStr);
    if (!regex.test(String(actual))) {
      throw new Error(
        `Assertion failed at [${path}]: expected to match [${expected}], got [${actual}]`,
      );
    }
    return;
  }

  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
    for (const key of Object.keys(expected)) {
      const subPath = path ? `${path}.${key}` : key;
      const actualVal = getValueByPath(actual, key);
      assertMatch(actualVal, expected[key], subPath);
    }
  } else {
    if (actual != expected) {
      throw new Error(`Assertion failed at [${path}]: expected [${expected}], got [${actual}]`);
    }
  }
}

async function runFile(filePath: string) {
  console.log(`\n📄 Running file: ${filePath}`);
  let content: string;
  try {
    content = await fsp.readFile(filePath, 'utf8');
  } catch (e: any) {
    console.error(`  ❌ Failed to read file: ${e.message}`);
    return;
  }

  let documents: any[];
  try {
    documents = yaml.loadAll(content) as any[];
  } catch (e: any) {
    console.error(`  ❌ YAML Parse error: ${e.message}`);
    return;
  }

  let teardownSteps: any[] = [];
  let setupSteps: any[] = [];
  const tests: any[] = [];

  for (const doc of documents) {
    if (!doc) continue;
    if (doc.setup) {
      setupSteps = setupSteps.concat(doc.setup);
    }
    if (doc.teardown) {
      teardownSteps = teardownSteps.concat(doc.teardown);
    }
    for (const key of Object.keys(doc)) {
      if (key !== 'setup' && key !== 'teardown' && key !== 'requires') {
        tests.push({ name: key, steps: doc[key] });
      }
    }
  }

  // Run Setup once for the file
  let setupFailed = false;
  let setupError = '';
  if (setupSteps.length > 0) {
    console.log(` ▶️ Running Setup`);
    try {
      for (const step of setupSteps) {
        await runStep(step);
      }
    } catch (e: any) {
      console.error(`   ❌ Setup Failed: ${e.message}`);
      setupFailed = true;
      setupError = `Setup failed: ${e.message}`;
    }
  }

  for (const test of tests) {
    if (setupFailed) {
      allResults.push({ file: filePath, test: test.name, status: 'failed', error: setupError });
      continue;
    }

    console.log(` ▶️ Test: ${test.name}`);
    let lastResponse: any = null;
    try {
      for (const step of test.steps) {
        if (step.do) {
          lastResponse = await runStep(step);
          console.log('   📦 Response:', JSON.stringify(lastResponse, null, 2).substring(0, 1000));
        } else if (step.set) {
          for (let [key, path] of Object.entries(step.set)) {
            // In YAML, it might be: set: { _id: id }
            // where _id is the field in response, and id is the variable name
            // BUT wait, standard is set: { varName: path.in.body }
            // Let's check both
            let val = getValueByPath(lastResponse, path as string);
            if (val === undefined) {
              // Try swapping them
              val = getValueByPath(lastResponse, key);
              if (val !== undefined) {
                const tmp = key;
                key = path as string;
                path = tmp;
              }
            }
            variables[key] = val;
            // console.log(`   💡 Set $${key} = ${val}`);
          }
        } else if (step.match) {
          const key = Object.keys(step.match)[0];
          const expected = step.match[key];
          const actual = getValueByPath(lastResponse, key);
          // console.debug(`Matching [${key}]: actual=[${actual}], expected=[${replaceVariables(expected)}]`);
          assertMatch(actual, expected, key);
        } else if (step.is_true) {
          const val = getValueByPath(lastResponse, step.is_true);
          if (!val) throw new Error(`Expected [${step.is_true}] to be true, got [${val}]`);
        } else if (step.is_false) {
          const val = getValueByPath(lastResponse, step.is_false);
          if (val) throw new Error(`Expected [${step.is_false}] to be false, got [${val}]`);
        } else if (step.lt) {
          const key = Object.keys(step.lt)[0];
          const val = getValueByPath(lastResponse, key);
          const expected = replaceVariables(step.lt[key]);
          if (!(val < expected))
            throw new Error(`Expected [${key}] to be < [${expected}], got [${val}]`);
        } else if (step.gt) {
          const key = Object.keys(step.gt)[0];
          const val = getValueByPath(lastResponse, key);
          const expected = replaceVariables(step.gt[key]);
          if (!(val > expected))
            throw new Error(`Expected [${key}] to be > [${expected}], got [${val}]`);
        } else if (step.length) {
          const key = Object.keys(step.length)[0];
          const val = getValueByPath(lastResponse, key);
          const expected = step.length[key];
          if (val?.length !== expected)
            throw new Error(
              `Expected length of [${key}] to be [${expected}], got [${val?.length}]`,
            );
        }
      }
      console.log(`   ✅ Passed`);
      allResults.push({ file: filePath, test: test.name, status: 'passed' });
    } catch (e: any) {
      console.error(`   ❌ Failed: ${e.message}`);
      allResults.push({ file: filePath, test: test.name, status: 'failed', error: e.message });
    }
  }

  // Run Teardown once for the file
  if (teardownSteps.length > 0) {
    console.log(` ▶️ Running Teardown`);
    for (const step of teardownSteps) {
      try {
        await runStep(step);
      } catch (e) {}
    }
  }
}

async function main() {
  const testPath = process.argv[2] || './external-tests/tests';
  console.log(`Scanning for tests in: ${testPath}`);

  let files: string[];
  const stat = await fsp.stat(testPath);
  if (stat.isFile()) {
    files = [testPath];
  } else {
    const pattern = path.join(testPath, '**/*.yml').replace(/\\/g, '/');
    files = await glob(pattern);
  }

  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  console.log(`Found ${files.length} test files.`);

  for (const file of files) {
    // Clear variables between files
    for (const key of Object.keys(variables)) {
      delete variables[key];
    }
    await runFile(file);
  }

  const summary = {
    total: allResults.length,
    passed: allResults.filter((r) => r.status === 'passed').length,
    failed: allResults.filter((r) => r.status === 'failed').length,
    results: allResults,
  };

  const reportPath = path.join(path.dirname(testPath), 'test-report.json');
  await fsp.writeFile(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\n📝 Report written to: ${reportPath}`);
  console.log(`📊 Summary: ${summary.passed} passed, ${summary.failed} failed`);
}

main().catch(console.error);
