import { Router } from 'express';
import { globalStore } from './store.js';

export function createClusterRouter() {
  const router = Router();

  router.get('/_cluster/health', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      status: 'green',
      timed_out: false,
      number_of_nodes: 1,
      number_of_data_nodes: 1,
      active_primary_shards: 0,
      active_shards: 0,
      relocating_shards: 0,
      initializing_shards: 0,
      unassigned_shards: 0,
      delayed_unassigned_shards: 0,
      number_of_pending_tasks: 0,
      number_of_in_flight_fetch: 0,
      task_max_waiting_in_queue_millis: 0,
      active_shards_percent_as_number: 100,
    });
  });

  router.get('/_cluster/info', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      cluster_uuid: 'mock-uuid',
      version: { number: '8.10.0' },
      tagline: 'You know, for Search',
    });
  });

  router.get('/_cluster/state/:metric?', (req, res) => {
    const { metric } = req.params;

    const state: any = {
      cluster_name: 'elastic-mock',
      cluster_uuid: 'z1234567890',
      master_node: 'mock-node-id',
    };

    if (!metric || metric === 'metadata') {
      const indices: any = {};
      globalStore.getAllIndices().forEach((idx) => {
        indices[idx.name] = {
          state: 'open',
          settings: idx.settings,
          mappings: idx.mappings,
        };
      });

      state.metadata = {
        cluster_uuid: 'z1234567890',
        indices: indices,
      };
    }

    res.json(state);
  });

  // Mock Settings
  router.put('/_cluster/settings', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_cluster/settings', (req, res) => {
    res.json({
      persistent: {},
      transient: {},
    });
  });

  router.post('/_cluster/allocation/explain', (req, res) => {
    const { index, shard } = { ...req.query, ...req.body } as any;
    res.json({
      index: index || 'allocation_explain',
      shard: parseInt(shard as string) || 0,
      primary: true,
      current_state: 'started',
      current_node: { id: 'mock-node', name: 'mock-node' },
    });
  });

  router.get('/_cluster/allocation/explain', (req, res) => {
    const { index, shard } = { ...req.query, ...req.body } as any;
    res.json({
      index: index || 'allocation_explain',
      shard: parseInt(shard as string) || 0,
      primary: true,
      current_state: 'started',
      current_node: { id: 'mock-node', name: 'mock-node' },
    });
  });

  router.get('/_cluster/pending_tasks', (req, res) => {
    res.json({ tasks: [] });
  });

  router.post('/_cluster/reroute', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_cluster/stats', (req, res) => {
    res.json({
      _nodes: { total: 1, successful: 1, failed: 0 },
      cluster_name: 'elastic-mock',
      cluster_uuid: 'z1234567890',
      status: 'green',
    });
  });

  router.post('/_cluster/voting_config_exclusions', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_cluster/voting_config_exclusions', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
