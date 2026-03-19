import { Router } from 'express';
import { globalStore } from './store.js';

export function createClusterRouter() {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({
      cluster_name: 'elasticsearch',
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

  router.get('/state/:metric?', (req, res) => {
    const { metric } = req.params;

    const state: any = {
      cluster_name: 'elastic-mock',
      cluster_uuid: 'z1234567890',
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
  router.put('/settings', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/settings', (req, res) => {
    res.json({
      persistent: {},
      transient: {},
    });
  });

  return router;
}
