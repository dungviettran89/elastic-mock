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

function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

async function runStep(step: any) {
  if (step.do) {
    const actionKey = Object.keys(step.do)[0];
    const params = step.do[actionKey];

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

    // Special cases or direct check
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
      if (step.do.catch) {
        return e;
      }
      throw e;
    }
  }
  return null;
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
    if (doc.requires) continue;
    if (doc.setup) {
      setupSteps = doc.setup;
      continue;
    }
    if (doc.teardown) {
      teardownSteps = doc.teardown;
      continue;
    }
    for (const testName of Object.keys(doc)) {
      tests.push({ name: testName, steps: doc[testName] });
    }
  }

  // Run Setup once for the file
  if (setupSteps.length > 0) {
    console.log(` ▶️ Running Setup`);
    try {
      for (const step of setupSteps) {
        await runStep(step);
      }
    } catch (e: any) {
      console.error(`   ❌ Setup Failed: ${e.message}`);
      return;
    }
  }

  for (const test of tests) {
    console.log(` ▶️ Test: ${test.name}`);
    try {
      for (const step of test.steps) {
        await runStep(step);
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
