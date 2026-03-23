import { Router } from 'express';
import { globalStore } from '../../store.js';

// In-memory store for reindex status
const reindexStatus = new Map<string, boolean>();

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

  router.post(['/_index/:source/_create_from/:dest', '/_create_from/:source/:dest'], (req, res) => {
    const { source, dest } = req.params;
    try {
      globalStore.cloneIndex(source, dest);
      res.json({ acknowledged: true });
    } catch (e: any) {
      if (e.message.includes('not found')) {
        res.status(404).json({
          error: {
            root_cause: [{ type: 'index_not_found_exception', reason: 'no such index' }],
            type: 'index_not_found_exception',
            reason: 'no such index',
          },
          status: 404,
        });
      } else {
        res.status(400).json({ error: e.message });
      }
    }
  });

  router.put(['/_index/:source/_create_from/:dest', '/_create_from/:source/:dest'], (req, res) => {
    const { source, dest } = req.params;
    try {
      globalStore.cloneIndex(source, dest);
      res.json({ acknowledged: true });
    } catch (e: any) {
      if (e.message.includes('not found')) {
        res.status(404).json({
          error: {
            root_cause: [{ type: 'index_not_found_exception', reason: 'no such index' }],
            type: 'index_not_found_exception',
            reason: 'no such index',
          },
          status: 404,
        });
      } else {
        res.status(400).json({ error: e.message });
      }
    }
  });

  router.post('/_migration/reindex', (req, res) => {
    const body = req.body || {};
    const source = body.source?.index;
    if (source) {
      reindexStatus.set(source, true);
    }
    res.json({ acknowledged: true });
  });

  router.get('/_migration/reindex/:index/_status', (req, res) => {
    res.json({ start_time_millis: Date.now(), total_indices_in_data_stream: 1 });
  });

  router.delete('/_migration/reindex/:index', (req, res) => {
    const { index } = req.params;
    if (reindexStatus.has(index)) {
      reindexStatus.delete(index);
      res.json({ acknowledged: true });
    } else {
      res.status(404).json({
        error: {
          root_cause: [{ type: 'resource_not_found_exception', reason: 'migration not found' }],
          type: 'resource_not_found_exception',
          reason: 'migration not found',
        },
        status: 404,
      });
    }
  });

  router.post('/_migration/reindex/:index/_cancel', (req, res) => {
    const { index } = req.params;
    if (reindexStatus.has(index)) {
      reindexStatus.delete(index);
      res.json({ acknowledged: true });
    } else {
      res.status(404).json({
        error: {
          root_cause: [{ type: 'resource_not_found_exception', reason: 'migration not found' }],
          type: 'resource_not_found_exception',
          reason: 'migration not found',
        },
        status: 404,
      });
    }
  });

  return router;
}
