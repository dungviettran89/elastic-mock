import { Client } from '@elastic/elasticsearch';
import yaml from 'js-yaml';
import path from 'path';
import { glob } from 'glob';
import * as fsp from 'fs/promises';

const client = new Client({
  node: 'http://localhost:19200',
});

// Mock headers method for tests that expect it (some versions of the client or YAML runner)
(client as any).headers = () => ({});

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
    let actionKey = Object.keys(step.do).find(
      (k) => k !== 'catch' && k !== 'headers' && k !== 'node_selector' && k !== 'warnings',
    );
    if (!actionKey) {
      if (step.do.catch) return null; // Just a catch with no action? Should not happen normally.
      actionKey = Object.keys(step.do)[0];
    }
    let params = step.do[actionKey];
    const headers = step.do.headers || {};

    // Handle ignore parameter
    let ignoreCodes: number[] = [];
    if (params && params.ignore) {
      ignoreCodes = Array.isArray(params.ignore) ? params.ignore : [params.ignore];
      delete params.ignore;
    }

    params = replaceVariables(params);

    // Common parameter renames for client compatibility
    if (params && typeof params === 'object') {
      if (actionKey.includes('ilm.') && params.policy) {
        params.name = params.policy;
      }
      if (actionKey.includes('snapshot.') && params.snapshot) {
        params.snapshot = params.snapshot; // Already correct, but some might need 'name'
      }
      if (actionKey.includes('repository') && params.repository) {
        params.name = params.repository;
      }
    }

    // Auto-parse string body as JSON if it looks like JSON
    if (
      typeof params === 'string' &&
      (params.trim().startsWith('{') || params.trim().startsWith('['))
    ) {
      try {
        params = JSON.parse(params);
      } catch (e) {
        // Not valid JSON, keep as string
      }
    }

    // Also auto-parse params.body if it's a string JSON
    if (
      params &&
      typeof params === 'object' &&
      typeof params.body === 'string' &&
      (params.body.trim().startsWith('{') || params.body.trim().startsWith('['))
    ) {
      try {
        params.body = JSON.parse(params.body);
      } catch (e) {
        // Not valid JSON
      }
    }

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

    // Fallback to performRequest for missing methods in client but present in YAML tests
    const methodMap: Record<string, { method: string; path: string }> = {
      'indices.remove_block': { method: 'DELETE', path: '/{index}/_block/{block}' },
      'indices.get_data_stream_mappings': { method: 'GET', path: '/_data_stream/{name}/_mapping' },
      'indices.getDataStreamMappings': { method: 'GET', path: '/_data_stream/{name}/_mapping' },
      'indices.put_data_stream_mappings': { method: 'PUT', path: '/_data_stream/{name}/_mappings' },
      'indices.putDataStreamMappings': { method: 'PUT', path: '/_data_stream/{name}/_mappings' },
      'indices.put_data_stream_options': { method: 'PUT', path: '/_data_stream/{name}/_options' },
      'indices.putDataStreamOptions': { method: 'PUT', path: '/_data_stream/{name}/_options' },
      'indices.get_data_stream_options': { method: 'GET', path: '/_data_stream/{name}/_options' },
      'indices.getDataStreamOptions': { method: 'GET', path: '/_data_stream/{name}/_options' },
      'indices.delete_data_stream': { method: 'DELETE', path: '/_data_stream/{name}' },
      'indices.deleteDataStream': { method: 'DELETE', path: '/_data_stream/{name}' },
      'indices.recovery': { method: 'GET', path: '/{index}/_recovery' },
      'indices.create_from': { method: 'POST', path: '/_index/{source}/_create_from/{dest}' },
      'indices.createFrom': { method: 'POST', path: '/_index/{source}/_create_from/{dest}' },
      'esql.list_queries': { method: 'GET', path: '/_query/esql' },
      'esql.listQueries': { method: 'GET', path: '/_query/esql' },
      'esql.put_view': { method: 'PUT', path: '/_query/esql/view/{name}' },
      'esql.putView': { method: 'PUT', path: '/_query/esql/view/{name}' },
      'esql.get_view': { method: 'GET', path: '/_query/esql/view/{name}' },
      'esql.getView': { method: 'GET', path: '/_query/esql/view/{name}' },
      'esql.delete_view': { method: 'DELETE', path: '/_query/esql/view/{name}' },
      'esql.deleteView': { method: 'DELETE', path: '/_query/esql/view/{name}' },
      'esql.get_query': { method: 'GET', path: '/_query/esql/{id}' },
      'esql.getQuery': { method: 'GET', path: '/_query/esql/{id}' },
      'security.get_stats': { method: 'GET', path: '/_security/stats' },
      'security.getStats': { method: 'GET', path: '/_security/stats' },
      'security.get_service_accounts': { method: 'GET', path: '/_security/service' },
      'security.get_service_credentials': {
        method: 'GET',
        path: '/_security/service/{namespace}/{service}/credential',
      },
      'security.create_service_token': {
        method: 'POST',
        path: '/_security/service/{namespace}/{service}/credential/token/{name}',
      },
      'security.delete_service_token': {
        method: 'DELETE',
        path: '/_security/service/{namespace}/{service}/credential/token/{name}',
      },
      'security.clear_cached_service_tokens': {
        method: 'POST',
        path: '/_security/service/{namespace}/{service}/credential/token/{name}/_clear_cache',
      },
      'security.query_user': { method: 'POST', path: '/_security/_query/user' },
      'security.query_role': { method: 'POST', path: '/_security/_query/role' },
      'security.query_api_key': { method: 'POST', path: '/_security/_query/api_key' },
      'security.get_settings': { method: 'GET', path: '/_security/settings' },
      'security.update_settings': { method: 'PUT', path: '/_security/settings' },
      'security.get_user_profile': { method: 'GET', path: '/_security/profile/{uid}' },
      'security.getUserProfile': { method: 'GET', path: '/_security/profile/{uid}' },
      'security.activate_user_profile': { method: 'POST', path: '/_security/profile/_activate' },
      'security.has_privileges_user_profile': {
        method: 'POST',
        path: '/_security/profile/_has_privileges',
      },
      'security.suggest_user_profiles': { method: 'POST', path: '/_security/profile/_suggest' },
      'security.disable_user': { method: 'PUT', path: '/_security/user/{username}/_disable' },
      'security.enable_user': { method: 'PUT', path: '/_security/user/{username}/_enable' },
      'security.invalidate_token': { method: 'POST', path: '/_security/oauth2/token/invalidate' },
      'security.enable_user_profile': { method: 'POST', path: '/_security/profile/{uid}/_enable' },
      'security.disable_user_profile': {
        method: 'POST',
        path: '/_security/profile/{uid}/_disable',
      },
      'security.clear_api_key_cache': {
        method: 'POST',
        path: '/_security/api_key/{ids}/_clear_cache',
      },
      'security.create_cross_cluster_api_key': {
        method: 'POST',
        path: '/_security/cross_cluster/api_key',
      },
      'security.update_cross_cluster_api_key': {
        method: 'PUT',
        path: '/_security/cross_cluster/api_key/{id}',
      },
      'security.bulk_put_role': { method: 'POST', path: '/_security/role' },
      'security.bulk_delete_role': { method: 'DELETE', path: '/_security/role' },
      'security.clear_cached_roles': {
        method: 'POST',
        path: '/_security/role/{name}/_clear_cache',
      },
      'security.put_privileges': { method: 'PUT', path: '/_security/privilege' },
      'security.get_privileges': { method: 'GET', path: '/_security/privilege' },
      'security.get_builtin_privileges': {
        method: 'GET',
        path: '/_security/user_privileges/builtin',
      },
      'security.get_user': { method: 'GET', path: '/_security/user/{username}' },
      'security.put_user': { method: 'PUT', path: '/_security/user/{username}' },
      'security.put_role': { method: 'PUT', path: '/_security/role/{name}' },
      'security.put_role_mapping': { method: 'PUT', path: '/_security/role_mapping/{name}' },
      'security.delete_role': { method: 'DELETE', path: '/_security/role/{name}' },
      'security.delete_user': { method: 'DELETE', path: '/_security/user/{username}' },
      'security.change_password': { method: 'POST', path: '/_security/user/{username}/_password' },
    };

    if (
      methodMap[actionKey] ||
      methodMap[method] ||
      (parts[0] === 'indices' && methodMap[`indices.${method}`])
    ) {
      const mapping = methodMap[actionKey] || methodMap[method] || methodMap[`indices.${method}`];
      let path = mapping.path;
      for (const [key, value] of Object.entries(params || {})) {
        if (path.includes(`{${key}}`)) {
          path = path.replace(`{${key}}`, String(value));
          delete (params as any)[key];
        }
      }
      // Remove any remaining placeholders (optional params)
      path = path.replace(/\/{[a-zA-Z0-9_]+}/g, '');
      path = path.replace(/{[a-zA-Z0-9_]+}/g, '');
      
      try {
        const requestParams: any = {
          method: mapping.method,
          path: path,
          headers: headers,
        };
        if (params && params.body) {
          requestParams.body = params.body;
          delete params.body;
        }
        if (params && Object.keys(params).length > 0) {
          requestParams.querystring = params;
        }
        const res = await (client as any).transport.request(requestParams);
        const resData = res.body !== undefined ? res.body : res;
        if (
          actionKey === 'cluster.info' ||
          actionKey.includes('cluster') ||
          actionKey.includes('security') ||
          actionKey.includes('license') ||
          actionKey.includes('esql')
        ) {
          console.log(`   DEBUG ${actionKey} response:`, JSON.stringify(resData));
        }
        return resData;
      } catch (e: any) {
        const errorBody = e.meta?.body || e.body || e;
        const statusCode = e.meta?.statusCode || e.statusCode;
        console.log(`   DEBUG ${actionKey} error body:`, JSON.stringify(errorBody));
        if (ignoreCodes.includes(statusCode)) return errorBody;
        if (step.do.catch) return handleCatch(step.do.catch, errorBody, statusCode);
        throw e;
      }
    }

    if (typeof target[method] !== 'function') {
      if (actionKey.startsWith('cat.')) {
        const rawCatMethod = actionKey.substring(4);
        const pathsToTry = [`/_cat/${rawCatMethod}`, `/_cat/${rawCatMethod.replace(/_/g, '/')}`];

        for (const p of pathsToTry) {
          try {
            const res = await (client as any).transport.request({
              method: 'GET',
              path: p,
              querystring: params,
              headers: headers,
            });
            return res.body !== undefined ? res.body : res;
          } catch (e: any) {
            if (e.meta?.statusCode === 404 && p !== pathsToTry[pathsToTry.length - 1]) {
              continue;
            }
            throw e;
          }
        }
      }
      throw new Error(`Client method not found: ${actionKey} (as ${method})`);
    }

    try {
      const response = await target[method].bind(target)(params, { headers: headers });
      const resData = response.body !== undefined ? response.body : response;
      if (
        actionKey === 'cluster.info' ||
        actionKey.includes('security') ||
        actionKey.includes('license') ||
        actionKey.includes('esql')
      ) {
        console.log(`   DEBUG ${actionKey} response:`, JSON.stringify(resData));
      }
      if (step.do.catch && !ignoreCodes.includes(response.statusCode)) {
        throw new Error(`Expected error [${step.do.catch}] but got success`);
      }
      return resData;
    } catch (e: any) {
      console.error(`   ERROR in runStep (${actionKey}):`, e);
      const errorBody = e.meta?.body || e.body || e;
      const statusCode = e.meta?.statusCode || e.statusCode;

      if (ignoreCodes.includes(statusCode)) {
        return errorBody;
      }

      if (step.do.catch) {
        return handleCatch(step.do.catch, errorBody, statusCode);
      }
      throw e;
    }
  }
  return null;
}

function handleCatch(catchVal: any, errorBody: any, statusCode: number) {
  if (catchVal.startsWith('/') && catchVal.endsWith('/')) {
    const regex = new RegExp(catchVal.substring(1, catchVal.length - 1));
    const errorStr = JSON.stringify(errorBody);
    if (regex.test(errorStr)) {
      return errorBody;
    }
    throw new Error(`Error [${errorStr}] did not match catch regex [${catchVal}]`);
  } else if (catchVal === 'unauthorized' && statusCode === 401) {
    return errorBody;
  } else if (catchVal === 'forbidden' && statusCode === 403) {
    return errorBody;
  } else if (catchVal === 'missing' && statusCode === 404) {
    return errorBody;
  } else if (catchVal === 'request_timeout' && statusCode === 408) {
    return errorBody;
  } else if (catchVal === 'conflict' && statusCode === 409) {
    return errorBody;
  } else if (errorBody?.error?.type === catchVal || errorBody?.type === catchVal) {
    return errorBody;
  }
  // If it's a string catch but not a special one, try to match it in the error message
  if (typeof catchVal === 'string' && JSON.stringify(errorBody).includes(catchVal)) {
    return errorBody;
  }
  throw new Error(`Error did not match catch [${catchVal}]: ${JSON.stringify(errorBody)}`);
}

function getValueByPath(obj: any, path: string): any {
  if (!obj) return undefined;
  if (path === '$body' || path === '') return obj.body || obj;

  let data = obj.body || obj;

  if (path.startsWith('$')) {
    const parts = path.split('.');
    const varName = parts[0].substring(1);
    if (variables[varName] !== undefined) {
      data = variables[varName];
      if (parts.length === 1) return data;
      path = parts.slice(1).join('.');
    } else {
      console.log(`   DEBUG variable not found: ${varName}`);
    }
  }

  // Try exact path in body first (handles keys with dots)
  if (data && data[path] !== undefined) return data[path];
  // Try exact path at root
  if (obj && obj[path] !== undefined) return obj[path];

  // Remove trailing dot if present
  if (path.endsWith('.')) {
    path = path.substring(0, path.length - 1);
  }

  // Nested path traversal
  // Split by dots, but respect escaped dots (\.)
  const parts: string[] = [];
  let currentPart = '';
  for (let i = 0; i < path.length; i++) {
    if (path[i] === '\\' && path[i + 1] === '.') {
      currentPart += '.';
      i++;
    } else if (path[i] === '.') {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += path[i];
    }
  }
  parts.push(currentPart);

  let current = data;

  // Greedy match for keys with dots: try joining parts back
  // e.g. "indices.flush-index.primaries" -> might be data["indices"]["flush-index"]["primaries"]
  for (let i = 0; i < parts.length; i++) {
    if (current === undefined || current === null) return undefined;

    let found = false;
    // Try to find the longest possible key match starting from parts[i]
    for (let j = parts.length; j > i; j--) {
      const candidateKey = parts.slice(i, j).join('.');
      if (current[candidateKey] !== undefined) {
        current = current[candidateKey];
        i = j - 1; // skip consumed parts
        found = true;
        break;
      }
    }

    if (!found) {
      // Fallback: check at root if we are at the beginning
      if (i === 0 && obj[parts[0]] !== undefined) {
        current = obj[parts[0]];
        continue;
      }
      return undefined;
    }
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

  if (typeof expected === 'object' && expected !== null) {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) {
        throw new Error(
          `Assertion failed at [${path}]: expected array of length ${expected.length}, got ${actual?.length}`,
        );
      }
      for (let i = 0; i < expected.length; i++) {
        assertMatch(actual[i], expected[i], `${path}[${i}]`);
      }
    } else {
      for (const key of Object.keys(expected)) {
        const subPath = path ? `${path}.${key}` : key;
        const actualVal = getValueByPath(actual, key);
        assertMatch(actualVal, expected[key], subPath);
      }
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
          // console.log('   📦 Response:', JSON.stringify(lastResponse, null, 2).substring(0, 1000));
        } else if (step.set) {
          for (let [path, key] of Object.entries(step.set)) {
            let val = getValueByPath(lastResponse, path as string);
            console.log(
              `   DEBUG setting variable [${key}] from path [${path}] to:`,
              JSON.stringify(val),
            );
            variables[key] = val;
          }
        } else if (step.match) {
          const key = Object.keys(step.match)[0];
          const expected = step.match[key];
          const actual = getValueByPath(lastResponse, key);
          assertMatch(actual, expected, key);
        } else if (step.is_true) {
          const val = getValueByPath(lastResponse, step.is_true);
          if (val === undefined || val === null || val === false) {
            throw new Error(`Expected [${step.is_true}] to be true, got [${val}]`);
          }
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
          const actualLength = Array.isArray(val)
            ? val.length
            : typeof val === 'object' && val !== null
              ? Object.keys(val).length
              : val?.length;
          if (actualLength !== expected)
            throw new Error(
              `Expected length of [${key}] to be [${expected}], got [${actualLength}]`,
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
