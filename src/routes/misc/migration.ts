import { Router } from 'express';

export function createMigrationRouter() {
  const router = Router();

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

  router.post('/_migration/reindex', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_migration/reindex/:index/_status', (req, res) => {
    res.json({ start_time_millis: Date.now(), total_indices_in_data_stream: 1 });
  });

  router.post('/_migration/reindex/:index/_cancel', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
