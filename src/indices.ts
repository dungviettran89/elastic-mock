import { Router } from 'express';
import { globalStore } from './store.js';
import { logger } from './logger.js';

export function createIndicesRouter() {
  const router = Router();

  // Create Index
  router.put('/:index', (req, res) => {
    const { index } = req.params;
    logger.info(`Indices: Creating index [${index}]`);
    try {
      globalStore.createIndex(index, req.body || {});
      res.status(200).json({
        acknowledged: true,
        shards_acknowledged: true,
        index: index,
      });
    } catch (error: any) {
      logger.error(`Indices: Failed to create index [${index}]: ${error.message}`);
      res.status(400).json({
        error: {
          root_cause: [{ type: 'resource_already_exists_exception', reason: error.message }],
          type: 'resource_already_exists_exception',
          reason: error.message,
          index: index,
        },
        status: 400,
      });
    }
  });

  // Index Exists
  router.head('/:index', (req, res) => {
    const { index } = req.params;
    if (globalStore.hasIndex(index)) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }
  });

  // Delete Index
  router.delete('/:index', (req, res) => {
    const { index } = req.params;
    logger.info(`Indices: Deleting index [${index}]`);
    if (globalStore.deleteIndex(index)) {
      res.status(200).json({ acknowledged: true });
    } else {
      logger.warn(`Indices: Delete failed, index [${index}] not found`);
      res.status(404).json({
        error: {
          root_cause: [
            { type: 'index_not_found_exception', reason: 'no such index', index: index },
          ],
          type: 'index_not_found_exception',
          reason: 'no such index',
          index: index,
        },
        status: 404,
      });
    }
  });

  // Get Mapping
  router.get('/:index/_mapping', (req, res) => {
    const { index } = req.params;
    const state = globalStore.getIndex(index);
    if (state) {
      res.json({
        [index]: {
          mappings: state.mappings,
        },
      });
    } else {
      res.status(404).json({
        error: {
          root_cause: [
            { type: 'index_not_found_exception', reason: 'no such index', index: index },
          ],
          type: 'index_not_found_exception',
          reason: 'no such index',
          index: index,
        },
        status: 404,
      });
    }
  });

  return router;
}
