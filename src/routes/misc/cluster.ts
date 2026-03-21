import { Router } from 'express';

export function createClusterRouter() {
  const router = Router();

  router.get('/_cluster/info/:target?', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      cluster_uuid: 'mock-uuid',
      version: { number: '8.10.0' },
      tagline: 'You know, for Search',
    });
  });

  router.get('/_cluster/health/:index?', (req, res) => {
    const index = req.params.index || '_all';
    res.json({
      cluster_name: 'elastic-mock',
      status: 'green',
      timed_out: false,
      number_of_nodes: 1,
      number_of_data_nodes: 1,
      active_primary_shards: 1,
      active_shards: 1,
      relocating_shards: 0,
      initializing_shards: 0,
      unassigned_shards: 0,
      delayed_unassigned_shards: 0,
      number_of_pending_tasks: 0,
      number_of_in_flight_fetch: 0,
      task_max_waiting_in_queue_millis: 0,
      active_shards_percent_as_number: 100.0,
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

  router.get('/_remote/info', (req, res) => {
    res.json({});
  });

  router.get('/_dangling', (req, res) => {
    res.json({ dangling_indices: [] });
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
        query: { match: { message: 'hello world' } },
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

  return router;
}
