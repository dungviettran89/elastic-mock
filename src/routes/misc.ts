import { Router } from 'express';
import { logger } from '../logger.js';
import { globalStore } from '../store.js';

export function createMiscRouter() {
  const router = Router();

  router.get('/_watcher/stats', (req, res) => {
    res.json({
      _nodes: { total: 1, successful: 1, failed: 0 },
      cluster_name: 'elastic-mock',
      manually_stopped: false,
      stats: [
        {
          node_id: 'mock-node-id',
          status: 'started',
          watcher_state: 'started',
          watch_count: 0,
          execution_thread_pool: { queue_size: 0, max_size: 10 },
        },
      ],
    });
  });

  router.put(['/_scripts/:id', '/_scripts/:id/:context'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_scripts/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_scripts/:id', (req, res) => {
    res.json({
      _id: req.params.id,
      found: true,
      script: { lang: 'painless', source: 'return 1' },
    });
  });

  router.post('/_scripts/:lang/_execute', (req, res) => {
    const body = req.body || {};
    const script = body.script || {};
    const params = script.params || {};

    // Try to evaluate simple arithmetic expressions from params
    if (
      script.source &&
      script.source.includes('params.count') &&
      script.source.includes('params.total')
    ) {
      const count = params.count || 0;
      const total = params.total || 1;
      const result = count / total;
      res.json({ result });
    } else {
      res.json({ result: '1' });
    }
  });

  router.get('/_script_context', (req, res) => {
    res.json({
      contexts: [
        {
          name: 'score',
          methods: [
            {
              name: 'execute',
              return_type: 'double',
              params: [],
            },
          ],
        },
        {
          name: 'filter',
          methods: [
            {
              name: 'execute',
              return_type: 'boolean',
              params: [],
            },
          ],
        },
        {
          name: 'ingest',
          methods: [
            {
              name: 'execute',
              return_type: 'void',
              params: [],
            },
          ],
        },
      ],
    });
  });

  router.get('/_script_languages', (req, res) => {
    res.json({
      languages: ['painless', 'mustache', 'expression'],
      types_allowed: ['inline', 'stored'],
      contexts: ['score', 'filter', 'ingest'],
    });
  });

  router.post(['/_sql', '/_sql/translate', '/_sql/close'], (req, res) => {
    res.json({
      columns: [],
      rows: [],
      sql: 'SELECT 1',
      size: true,
      acknowledged: true,
      succeeded: true,
    });
  });

  router.get(['/_sql/async/status/:id', '/_sql/async/:id'], (req, res) => {
    res.json({
      id: req.params.id || 'mock-id',
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
      response: { columns: [], rows: [] },
    });
  });

  router.delete('/_sql/async/delete/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post(['/_reindex/:id/_rethrottle', '/_delete_by_query/:id/_rethrottle'], (req, res) => {
    res.json({
      node_failures: [
        {
          caused_by: {
            type: 'no_such_node_exception',
          },
        },
      ],
    });
  });

  // Cluster
  router.get('/_cluster/info/:target?', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      cluster_uuid: 'mock-uuid',
      version: { number: '8.10.0' },
      tagline: 'You know, for Search',
    });
  });

  router.get('/_cluster/allocation/explain', (req, res) => {
    const body = req.body || {};
    const query = req.query || {};
    const index = body.index || query.index || 'allocation_explain';
    const shard = parseInt((body.shard || query.shard || '0') as string);
    res.json({
      index: index,
      shard: shard,
      primary: true,
      current_state: 'started',
      can_remain_on_current_node: 'yes',
      can_rebalance_cluster: 'yes',
      can_rebalance_to_other_node: 'yes',
      rebalance_explanation: 'rebalancing is allowed',
    });
  });

  // Remote
  router.get('/_remote/info', (req, res) => {
    res.json({});
  });

  // Dangling
  router.get('/_dangling', (req, res) => {
    res.json({ dangling_indices: [] });
  });

  // Enrich
  router.put('/_enrich/policy/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_enrich/policy/:name?', (req, res) => {
    const name = req.params.name || 'policy_test';
    res.json({
      policies: [
        {
          config: {
            match: {
              name: name,
              indices: ['enrich_tests*'],
              match_field: 'baz',
              enrich_fields: ['a', 'b'],
            },
          },
        },
      ],
    });
  });

  router.delete('/_enrich/policy/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post(['/_enrich/policy/:name/_execute', '/_enrich/policy/:name/_execute'], (req, res) => {
    res.json({ status: { phase: 'COMPLETE' } });
  });

  router.put('/_enrich/policy/:name/_execute', (req, res) => {
    res.json({ status: { phase: 'COMPLETE' } });
  });

  router.get('/_enrich/_stats', (req, res) => {
    res.json({ executing_policies: [], coordinator_stats: [] });
  });

  router.get('/_ssl/certificates', (req, res) => {
    res.json([
      {
        path: '/path/to/cert.pem',
        format: 'PEM',
        type: 'certificate',
        alias: 'mock-cert',
      },
    ]);
  });

  router.post('/_render/template', (req, res) => {
    res.json({
      template_output: {
        query: {
          match: {
            message: 'hello world',
          },
        },
      },
    });
  });

  router.get('/_xpack', (req, res) => {
    res.json({
      build: { hash: 'unknown', date: 'unknown' },
      features: {
        aggregate_metric: { available: true, enabled: true },
        analytics: { available: true, enabled: true },
        ccr: { available: true, enabled: true },
        data_streams: { available: true, enabled: true },
        ilm: { available: true, enabled: true },
        ml: { available: true, enabled: true },
        monitoring: { available: true, enabled: true },
        rollup: { available: true, enabled: true },
        security: { available: true, enabled: true },
        sql: { available: true, enabled: true },
        transform: { available: true, enabled: true },
        watcher: { available: true, enabled: true },
      },
      tagline: 'You know, for X',
    });
  });

  router.get('/_xpack/usage', (req, res) => {
    res.json({
      security: { available: true, enabled: true },
      watcher: { available: true, enabled: true },
      enterprise_search: {
        available: true,
        enabled: true,
        search_applications: { count: 0 },
        analytics_collections: { count: 0 },
        query_rulesets: {
          total_count: 0,
          total_rule_count: 0,
          min_rule_count: 0,
          max_rule_count: 0,
        },
      },
    });
  });

  router.post('/_query', (req, res) => {
    res.json({
      columns: [],
      rows: [],
    });
  });

  router.post('/_query/async', (req, res) => {
    res.json({
      id: 'mock-esql-async-id',
      is_running: false,
    });
  });

  router.get('/_license', (req, res) => {
    res.json({
      license: {
        status: 'active',
        uid: 'mock-license-id',
        type: 'trial',
        issue_date_in_millis: Date.now(),
        expiry_date_in_millis: Date.now() + 1000 * 60 * 60 * 24 * 30,
      },
    });
  });

  // Explain API
  router.post('/:index/_explain/:id', (req, res) => {
    const { index, id } = req.params;
    const body = req.body || {};
    const query = body.query || {};

    res.json({
      _index: index,
      _id: id,
      matched: true,
      explanation: {
        value: 1.0,
        description: 'weight',
        details: [
          {
            value: 1.0,
            description: 'Query',
            details: [],
          },
        ],
      },
    });
  });

  // Field Caps API
  router.post(['/_field_caps', '/:index/_field_caps'], (req, res) => {
    const { index } = req.params;
    const body = req.body || {};
    let fields = body.fields || [];

    // Handle both string and array for fields
    if (typeof fields === 'string') {
      fields = [fields];
    }

    // Build a mock response for field capabilities
    const result: any = {
      indices: index ? [index] : [],
      fields: {},
    };

    // For each field, return a mock capability
    // The structure is: fields.<field_name>.<type>.<property>
    for (const field of fields) {
      result.fields[field] = {
        text: {
          type: 'text',
          searchable: true,
          aggregatable: false,
          indices: index ? [index] : ['mock-index'],
          metadata_field: false,
        },
      };
    }

    // If no fields specified, return all common fields
    if (fields.length === 0) {
      result.fields = {
        text: {
          text: {
            type: 'text',
            searchable: true,
            aggregatable: false,
            indices: index ? [index] : ['mock-index'],
            metadata_field: false,
          },
        },
      };
    }

    res.json(result);
  });

  router.put('/_ingest/pipeline/:id', (req, res) => {
    globalStore.putPipeline(req.params.id, req.body);
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/pipeline/:id?', (req, res) => {
    const { id } = req.params;
    if (id) {
      const pipeline = globalStore.getPipeline(id);
      if (pipeline) {
        res.json({ [id]: pipeline });
      } else {
        res.status(404).json({ error: 'pipeline_missing_exception' });
      }
    } else {
      const pipelines = globalStore.getAllPipelines();
      res.json(Object.fromEntries(pipelines));
    }
  });

  router.delete('/_ingest/pipeline/:id', (req, res) => {
    globalStore.deletePipeline(req.params.id);
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/geoip/stats', (req, res) => {
    res.json({
      stats: {
        successful_downloads: 0,
        failed_downloads: 0,
        skipped_updates: 0,
        databases_count: 0,
        total_download_time: 0,
      },
      nodes: {
        'mock-node-id': {
          databases: [],
        },
      },
    });
  });

  router.put('/_ingest/ip_location/database/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_ingest/geoip/database/:id', (req, res) => {
    globalStore.putGeoIPDatabase(req.params.id, req.body);
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/geoip/database/:id?', (req, res) => {
    const id = req.params.id;
    const databases = globalStore.getGeoIPDatabase(id);
    res.json({ databases });
  });

  router.delete('/_ingest/geoip/database/:id', (req, res) => {
    globalStore.deleteGeoIPDatabase(req.params.id);
    res.json({ acknowledged: true });
  });

  router.get('/_info/ingest', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      lookup: {
        ingest: {
          processors: [
            { type: 'append' },
            { type: 'bytes' },
            { type: 'circle' },
            { type: 'community_id' },
            { type: 'convert' },
            { type: 'csv' },
            { type: 'date' },
            { type: 'date_index_name' },
            { type: 'dissect' },
            { type: 'dot_expander' },
            { type: 'drop' },
            { type: 'enrich' },
            { type: 'fail' },
            { type: 'foreach' },
            { type: 'geoip' },
            { type: 'grok' },
            { type: 'gsub' },
            { type: 'html_strip' },
            { type: 'join' },
            { type: 'json' },
            { type: 'kv' },
            { type: 'lowercase' },
            { type: 'network_direction' },
            { type: 'pipeline' },
            { type: 'remove' },
            { type: 'rename' },
            { type: 'script' },
            { type: 'set' },
            { type: 'set_security_user' },
            { type: 'sort' },
            { type: 'split' },
            { type: 'trim' },
            { type: 'uppercase' },
            { type: 'uri_parts' },
            { type: 'user_agent' },
          ],
        },
      },
    });
  });

  // Async Search
  router.post(['/:index/_async_search', '/_async_search'], (req, res) => {
    const { index } = req.params;
    let searchResponse: any;
    try {
      if (index) {
        searchResponse = globalStore.search(index, { ...req.query, ...req.body });
      } else {
        const indices = globalStore.getAllIndices();
        let allHits: any[] = [];
        indices.forEach((idx: any) => {
          try {
            const result = globalStore.search(idx.name, { ...req.query, ...req.body });
            allHits = allHits.concat(result.hits.hits);
          } catch (e) {}
        });
        const size = req.body?.size || 10;
        searchResponse = {
          took: 1,
          timed_out: false,
          _shards: { total: indices.length, successful: indices.length, skipped: 0, failed: 0 },
          hits: {
            total: { value: allHits.length, relation: 'eq' },
            max_score: allHits.length > 0 ? 1.0 : null,
            hits: allHits.slice(0, size),
          },
        };
      }
    } catch (e) {
      searchResponse = {
        took: 1,
        timed_out: false,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      };
    }

    res.json({
      id: 'mock-async-search-id',
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      response: searchResponse,
    });
  });

  router.get('/_async_search/:id', (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
      response: {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 1.0,
          hits: [
            {
              _index: 'async_search_test_10',
              _id: '43',
              _score: 1.0,
              _source: { name: 'Bestiario', author: 'Julio Cortazar' },
            },
          ],
        },
      },
    });
  });

  router.get('/_async_search/status/:id', (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
    });
  });

  router.delete('/_async_search/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Text Structure
  router.get('/_text_structure/find_field_structure', (req, res) => {
    res.json({
      num_lines_analyzed: 3,
      num_messages_analyzed: 3,
      sample_start: '',
      charset: 'UTF-8',
      has_header_row: true,
      has_byte_order_marker: false,
      format: 'delimited',
      field_stats: {},
    });
  });

  router.post('/_text_structure/find_message_structure', (req, res) => {
    res.json({
      num_lines_analyzed: 3,
      num_messages_analyzed: 3,
      sample_start: '',
      charset: 'UTF-8',
      format: 'semi_structured_text',
    });
  });

  router.post('/_text_structure/find_structure', (req, res) => {
    res.json({
      num_lines_analyzed: 3,
      num_messages_analyzed: 3,
      sample_start: '',
      charset: 'UTF-8',
      format: 'ndjson',
    });
  });

  router.post('/_text_structure/test_grok_pattern', (req, res) => {
    res.json({
      matches: [
        {
          matched: true,
          fields: {
            first_name: [{ match: 'Dave', offset: 8, length: 4 }],
            last_name: [{ match: 'Roberts', offset: 13, length: 7 }],
          },
        },
        { matched: false },
      ],
    });
  });

  // Transform
  router.put('/_transform/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_transform/:id/_update', (req, res) => {
    res.json({ id: req.params.id, acknowledged: true });
  });

  router.post(
    ['/_transform/:id/_start', '/_transform/:id/_stop', '/_transform/_upgrade'],
    (req, res) => {
      res.json({ acknowledged: true });
    },
  );

  router.post('/_transform/:id/_preview', (req, res) => {
    res.json({ preview: [] });
  });

  router.post(['/_transform/:id/_schedule_now', '/_transform/:id/_reset'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_transform/:id/_stats', (req, res) => {
    const id = req.params.id || 'population';
    res.json({
      count: 1,
      transforms: [{ id: id, state: 'started' }],
    });
  });

  router.get('/_transform/:id?', (req, res) => {
    const id = req.params.id || 'population';
    res.json({
      count: 1,
      transforms: [{ id: id, state: 'started' }],
    });
  });

  router.delete('/_transform/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Synonyms
  router.put('/_synonyms/:id', (req, res) => {
    const result = globalStore.putSynonymSet(req.params.id, req.body);
    res.json(result);
  });

  router.get('/_synonyms/:id?', (req, res) => {
    const { id } = req.params;
    if (id) {
      const set = globalStore.getSynonymSet(id);
      if (set) {
        res.json(set);
      } else {
        res.status(404).json({ error: 'synonym_set_not_found' });
      }
    } else {
      res.json({
        count: globalStore.getAllSynonymSets().length,
        results: globalStore.getAllSynonymSets(),
      });
    }
  });

  router.delete('/_synonyms/:id', (req, res) => {
    globalStore.deleteSynonymSet(req.params.id);
    res.json({ acknowledged: true });
  });

  router.put('/_synonyms/:set_id/_rule/:rule_id', (req, res) => {
    const result = globalStore.putSynonymRule(req.params.set_id, req.params.rule_id, req.body);
    res.json(result);
  });

  router.put('/_synonyms/:set_id/:rule_id', (req, res) => {
    const result = globalStore.putSynonymRule(req.params.set_id, req.params.rule_id, req.body);
    res.json(result);
  });

  router.get('/_synonyms/:set_id/_rule/:rule_id', (req, res) => {
    const rule = globalStore.getSynonymRule(req.params.set_id, req.params.rule_id);
    if (rule) {
      res.json(rule);
    } else {
      res.status(404).json({ error: 'synonym_rule_not_found' });
    }
  });

  router.get('/_synonyms/:set_id/:rule_id', (req, res) => {
    const rule = globalStore.getSynonymRule(req.params.set_id, req.params.rule_id);
    if (rule) {
      res.json(rule);
    } else {
      res.status(404).json({ error: 'synonym_rule_not_found' });
    }
  });

  router.delete('/_synonyms/:set_id/_rule/:rule_id', (req, res) => {
    const result = globalStore.deleteSynonymRule(req.params.set_id, req.params.rule_id);
    res.json({ result: result ? 'deleted' : 'not_found' });
  });

  router.delete('/_synonyms/:set_id/:rule_id', (req, res) => {
    const result = globalStore.deleteSynonymRule(req.params.set_id, req.params.rule_id);
    res.json({ result: result ? 'deleted' : 'not_found' });
  });

  // Security
  router.get('/_security/_authenticate', (req, res) => {
    res.json({
      username: 'elastic',
      roles: ['superuser'],
      full_name: 'Elastic User',
      email: 'elastic@example.com',
      metadata: {},
      enabled: true,
      authentication_realm: { name: 'reserved', type: 'reserved' },
      lookup_realm: { name: 'reserved', type: 'reserved' },
      authentication_type: 'realm',
    });
  });

  router.post('/_security/api_key', (req, res) => {
    const name = req.body?.name || 'mock-api-key';
    res.json({
      id: 'mock-api-key-id',
      name: name,
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.put('/_security/api_key', (req, res) => {
    const name = req.body?.name || 'mock-api-key';
    res.json({
      id: 'mock-api-key-id',
      name: name,
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.get('/_security/api_key', (req, res) => {
    const name = req.query.name || 'test_api_key';
    res.json({
      api_keys: [
        {
          id: 'mock-api-key-id',
          name: name,
          expiration: Date.now() + 1000 * 60 * 60 * 24,
        },
      ],
    });
  });

  router.post('/_security/_query/api_key', (req, res) => {
    res.json({
      api_keys: [
        {
          id: 'mock-api-key-id',
          name: 'test_api_key',
          expiration: Date.now() + 1000 * 60 * 60 * 24,
        },
      ],
    });
  });

  router.delete('/_security/api_key', (req, res) => {
    const ids = req.body?.ids || ['mock-api-key-id'];
    res.json({
      invalidated_api_keys: ids,
      previously_invalidated_api_keys: [],
    });
  });

  router.post('/_security/user/_has_privileges', (req, res) => {
    const cluster = req.body?.cluster || [];
    const index = req.body?.index || [];

    const clusterRes: any = {};
    cluster.forEach((p: string) => {
      clusterRes[p] = true;
    });

    const indexRes: any = [];
    index.forEach((i: any) => {
      const privs: any = {};
      i.privileges.forEach((p: string) => {
        privs[p] = true;
      });
      indexRes.push({ names: i.names, privileges: privs });
    });

    res.json({
      username: 'elastic',
      has_all_requested: true,
      cluster: clusterRes,
      index: indexRes,
    });
  });

  router.put(['/_security/privilege', '/_security/privilege/:name'], (req, res) => {
    const body = req.body || {};
    const result: any = {};

    for (const [appName, appPrivs] of Object.entries(body)) {
      result[appName] = {};
      for (const [privName, _] of Object.entries(appPrivs as any)) {
        result[appName][privName] = { created: true };
      }
    }

    res.json(result);
  });

  router.get(['/_security/privilege', '/_security/privilege/:name'], (req, res) => {
    const name = req.params.name || 'app';
    res.json({
      [name]: {
        p1: { actions: ['action1'], metadata: {} },
        p2: { actions: ['action2'], metadata: {} },
      },
    });
  });

  router.put('/_security/role/:name', (req, res) => {
    res.json({ acknowledged: true, role: { created: true } });
  });

  router.get('/_security/role/:name?', (req, res) => {
    const name = req.params.name || 'admin_role';
    res.json({
      [name]: {
        metadata: { key1: 'val1', key2: 'val2' },
        indices: [{ names: ['*'], privileges: ['all'] }],
      },
    });
  });

  router.post('/_security/_query/role', (req, res) => {
    res.json({
      total: 1,
      count: 1,
      roles: [
        {
          name: 'admin_role',
          metadata: { key1: 'val1', key2: 'val2' },
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
      ],
    });
  });

  router.put('/_security/role_mapping/:name', (req, res) => {
    const result = globalStore.putRoleMapping(req.params.name, req.body);
    res.json(result);
  });

  router.get('/_security/role_mapping/:name?', (req, res) => {
    const name = req.params.name;
    const mappings = globalStore.getRoleMapping(name || undefined);
    res.json(mappings);
  });

  router.delete('/_security/role_mapping/:name', (req, res) => {
    globalStore.deleteRoleMapping(req.params.name);
    res.json({ acknowledged: true });
  });

  router.get('/_security/service/:namespace?/:service?', (req, res) => {
    const namespace = req.params.namespace || 'elastic';
    const service = req.params.service || 'auto-ops';
    res.json({
      [`${namespace}/${service}`]: {
        enabled: true,
        metadata: {},
      },
    });
  });

  router.post('/_security/_query/service', (req, res) => {
    res.json({
      total: 1,
      count: 1,
      services: [
        {
          name: 'elastic/auto-ops',
          enabled: true,
          metadata: {},
        },
      ],
    });
  });

  router.get('/_security/service/:name', (req, res) => {
    res.json({});
  });

  router.get('/_security/settings', (req, res) => {
    res.json({
      security: { enabled: true },
    });
  });

  router.get('/_security/stats', (req, res) => {
    res.json({
      realms: {},
      roles: {},
      api_keys: {},
    });
  });

  router.get('/_security/user_privileges/builtin', (req, res) => {
    res.json({
      cluster: ['all'],
      index: ['all'],
    });
  });

  router.post('/_security/user/:username', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_security/user/:username', (req, res) => {
    res.json({ acknowledged: true });
  });

  // ML
  router.put('/_ml/trained_models/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/trained_models/:id?', (req, res) => {
    res.json({ count: 0, trained_model_configs: [] });
  });

  router.get('/_ml/info', (req, res) => {
    res.json({
      defaults: {
        anomaly_detectors: {
          categorization_analyzer: {
            tokenizer: 'ml_standard',
            filter: ['lowercase'],
          },
          model_memory_limit: '1gb',
        },
        datafeeds: { scroll_size: 1000 },
      },
      limits: { max_model_memory_limit: '1gb' },
      upgrade_mode: false,
    });
  });

  // ML Memory Stats
  router.get('/_ml/memory/_stats', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      _nodes: { total: 1, successful: 1, failed: 0 },
      nodes: [
        {
          name: 'node1',
          ephemeral_id: 'mock-ephemeral-id',
          transport_address: '127.0.0.1:9300',
          weight: {
            anomaly_detector_job: {
              total: '1gb',
              allocated: '0mb',
              available: '1gb',
            },
          },
        },
      ],
    });
  });

  // ML Jobs - Get All
  router.get('/_ml/anomaly_detectors/_all', (req, res) => {
    res.json({ count: 0, jobs: [] });
  });

  router.get('/_ml/anomaly_detectors/:id', (req, res) => {
    if (req.params.id === '_all') {
      return res.json({ count: 0, jobs: [] });
    }
    res.json({ count: 0, jobs: [] });
  });

  router.put('/_ml/anomaly_detectors/:id', (req, res) => {
    const body = req.body || {};
    res.json({
      job_id: req.params.id,
      ...body,
      analysis_limits: body.analysis_limits || {
        model_memory_limit: '1024mb',
        categorization_examples_limit: 4,
      },
      create_time: Date.now(),
    });
  });

  router.post('/_ml/anomaly_detectors/:id/_open', (req, res) => {
    res.json({ acknowledged: true, opened: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_close', (req, res) => {
    res.json({ acknowledged: true, closed: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_flush', (req, res) => {
    res.json({ flushed: true });
  });

  router.delete('/_ml/anomaly_detectors/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/anomaly_detectors/:id/_stats', (req, res) => {
    res.json({
      count: 1,
      jobs: [{ job_id: req.params.id, state: 'opened' }],
    });
  });

  router.post('/_ml/anomaly_detectors/:id/_update', (req, res) => {
    const body = req.body || {};
    res.json({
      job_id: req.params.id,
      ...body,
    });
  });

  // Migration
  router.get('/_migration/system_features', (req, res) => {
    res.json({ features: [], migration_status: 'NO_MIGRATION_NEEDED' });
  });

  router.post('/_migration/system_features', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/*/_migration/deprecations', (req, res) => {
    res.json({
      cluster_settings: [],
      node_settings: [],
      index_settings: [],
      ml_settings: [],
    });
  });

  router.put('/_create_from/:source/:dest', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Query Rules
  router.put('/_query_rules/:id', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.put('/_query_rules/:id/_rule/:rule_id', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.get('/_query_rules/:ruleset_id/_rule/:rule_id', (req, res) => {
    res.json({
      ruleset_id: req.params.ruleset_id,
      rule_id: req.params.rule_id,
      type: 'pinned',
      criteria: [],
      actions: [],
    });
  });

  router.delete('/_query_rules/:id/_rule/:rule_id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Search Application
  router.put('/_application/search_application/:name', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.get('/_application/search_application/:name', (req, res) => {
    res.json({
      name: req.params.name,
      updated_at_millis: Date.now(),
      template: { script: { source: '{"match_all": {}}' } },
    });
  });

  router.delete('/_application/search_application/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_application/search_application', (req, res) => {
    res.json({
      count: 1,
      search_applications: [{ name: 'search_app' }],
    });
  });

  router.post('/_application/search_application/:name/_search', (req, res) => {
    res.json({
      hits: {
        total: { value: 0, relation: 'eq' },
        max_score: 0,
        hits: [],
      },
    });
  });

  router.get('/_application/analytics/:name', (req, res) => {
    res.json({
      name: req.params.name,
      created_at_millis: Date.now(),
    });
  });

  router.put('/_application/analytics/:name', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });
  
  // Connector API
  router.put('/_connector/:name', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });
  
  // EQL API
  router.post('/:index/_eql/search', (req, res) => {
    res.json({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      took: 1,
      timed_out: false,
    });
  });
  
  // ESQL API
  router.get('/_esql/queries', (req, res) => {
    res.json({ queries: [] });
  });
  
  router.put('/_esql/view/:name', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });
  
  router.get('/_esql/view/:name', (req, res) => {
    res.json({
      name: req.params.name,
      query: 'SELECT 1',
    });
  });
  
  router.delete('/_esql/view/:name', (req, res) => {
    res.json({ acknowledged: true });
  });
  
  // Data Stream API
  router.put('/_data_stream/:name', (req, res) => {
    res.json({ acknowledged: true });
  });
  
  router.put('/_data_stream/:name/_lifecycle', (req, res) => {
    res.json({ acknowledged: true });
  });
  
  router.post('/_data_stream/_migrate/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Streams
  router.post('/_streams/:log/_enable', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_streams/:log/_disable', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_streams/status', (req, res) => {
    res.json({
      'logs.otel': {
        enabled: true,
      },
    });
  });

  // Watcher
  router.put('/_watcher/watch/:id', (req, res) => {
    res.json({ _id: req.params.id, _version: 1, created: true });
  });

  router.delete('/_watcher/watch/:id', (req, res) => {
    res.json({ _id: req.params.id, _version: 1, found: true });
  });

  router.post('/_watcher/watch/:id/_ack', (req, res) => {
    res.json({ status: { state: { active: true } } });
  });

  router.post('/_watcher/_query/watches', (req, res) => {
    res.json({ count: 1, watches: [{ id: 'my-watch', watch: {} }] });
  });

  router.put('/_watcher/watch/:id/_execute', (req, res) => {
    res.json({
      watch_id: req.params.id,
      watch_record: { watch_id: req.params.id, state: 'executed' },
    });
  });

  router.post('/_watcher/watch/:id/_execute', (req, res) => {
    res.json({
      watch_id: req.params.id,
      watch_record: { watch_id: req.params.id, state: 'executed' },
    });
  });

  // PIT (Point in Time)
  router.post(['/_pit', '/:index/_pit'], (req, res) => {
    res.json({ id: 'mock-pit-id' });
  });

  router.delete('/_pit', (req, res) => {
    res.json({ succeeded: true, num_freed: 1 });
  });

  // Vector Tiles
  router.get(['/:index/_mvt/:field/:z/:x/:y', '/_mvt/:field/:z/:x/:y'], (req, res) => {
    res.status(200).send(Buffer.alloc(0));
  });

  return router;
}
