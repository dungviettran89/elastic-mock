import { Router } from 'express';
import { logger } from '../logger.js';

export function createMiscRouter() {
  const router = Router();

  router.get('/_watcher/stats', (req, res) => {
    res.json({
      _nodes: { total: 1, successful: 1, failed: 0 },
      cluster_name: 'elasticsearch',
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
    res.json({ result: '1' });
  });

  router.get('/_script_context', (req, res) => {
    res.json({ contexts: [] });
  });

  router.get('/_script_languages', (req, res) => {
    res.json({ languages: ['painless', 'mustache', 'expression'] });
  });

  router.post(['/_sql', '/_sql/translate'], (req, res) => {
    res.json({
      columns: [],
      rows: [],
      sql: 'SELECT 1',
      size: true,
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

  router.post('/_reindex/:id/_rethrottle', (req, res) => {
    res.json({ nodes: {} });
  });

  router.get('/_ssl/certificates', (req, res) => {
    res.json([]);
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

  router.put('/_ingest/pipeline/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/pipeline/:id?', (req, res) => {
    res.json({});
  });

  router.get('/_info/ingest', (req, res) => {
    res.json({
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
    res.json({
      id: 'mock-async-search-id',
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      response: {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      },
    });
  });

  router.get('/_async_search/:id', (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      response: {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      },
    });
  });

  router.delete('/_async_search/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Text Structure
  router.get('/_text_structure/find_field_structure', (req, res) => {
    res.json({
      charset: 'UTF-8',
      has_header_row: true,
      has_byte_order_marker: false,
      format: 'delimited',
      field_stats: {},
    });
  });

  // Transform
  router.put('/_transform/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_transform/:id/_start', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_transform/:id/_stop', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_transform/:id?', (req, res) => {
    res.json({ count: 0, transforms: [] });
  });

  router.delete('/_transform/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Synonyms
  router.put('/_synonyms/:id', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.get('/_synonyms/:id?', (req, res) => {
    res.json({ count: 0, synonyms_sets: [] });
  });

  router.delete('/_synonyms/:id', (req, res) => {
    res.json({ acknowledged: true });
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

  router.put('/_security/api_key', (req, res) => {
    res.json({
      id: 'mock-api-key-id',
      name: 'mock-api-key',
      api_key: 'mock-api-key-value',
      expiration: Date.now() + 1000 * 60 * 60 * 24,
    });
  });

  router.post('/_security/user/_has_privileges', (req, res) => {
    res.json({
      username: 'elastic',
      has_all_requested: true,
      cluster: {},
      index: {},
    });
  });

  router.put(['/_security/privilege', '/_security/privilege/:name'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put(['/_security/role/:name', '/_security/role_mapping/:name'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_security/service/:name', (req, res) => {
    res.json({});
  });

  router.get('/_security/settings', (req, res) => {
    res.json({});
  });

  router.get('/_security/stats', (req, res) => {
    res.json({
      realms: {},
      roles: {},
      api_keys: {},
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

  // Migration
  router.get('/_migration/system_features', (req, res) => {
    res.json({ features: [] });
  });

  router.post('/_migration/system_features', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_create_from/:source/:dest', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Query Rules
  router.put('/_query_rules/:id', (req, res) => {
    res.json({ acknowledged: true });
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

  // PIT (Point in Time)
  router.post(['/_pit', '/:index/_pit'], (req, res) => {
    res.json({ id: 'mock-pit-id' });
  });

  router.delete('/_pit', (req, res) => {
    res.json({ succeeded: true, num_freed: 1 });
  });

  // Application
  router.put(['/_application/search_application/:name', '/_application/analytics/:name'], (req, res) => {
    res.json({ acknowledged: true });
  });

  // Vector Tiles
  router.get(['/:index/_mvt/:field/:z/:x/:y', '/_mvt/:field/:z/:x/:y'], (req, res) => {
    res.status(200).send(Buffer.alloc(0));
  });

  return router;
}
