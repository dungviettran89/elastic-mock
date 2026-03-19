import { Router } from 'express';

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

  router.post(['/_sql', '/_sql/translate'], (req, res) => {
    res.json({
      columns: [],
      rows: [],
      sql: 'SELECT 1',
    });
  });

  router.get(['/_sql/async/status/:id', '/_sql/async/:id'], (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
      response: { columns: [], rows: [] },
    });
  });

  router.post('/_render/template', (req, res) => {
    res.json({
      template_output: {},
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

  return router;
}
