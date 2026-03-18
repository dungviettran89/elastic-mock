import { Router } from 'express';
import { globalStore } from './store.js';
import { logger } from './logger.js';

export function createSearchRouter() {
  const router = Router();

  // Index Specific Search
  router.post('/:index/_search', (req, res) => {
    const { index } = req.params;
    logger.info(`Search: Querying index [${index}]`);
    try {
      const result = globalStore.search(index, req.body || {});
      res.json(result);
    } catch (error: any) {
      logger.error(`Search: Query failed on [${index}]: ${error.message}`);
      res.status(404).json({
        error: {
          root_cause: [{ type: 'index_not_found_exception', reason: error.message, index: index }],
          type: 'index_not_found_exception',
          reason: error.message,
          index: index,
        },
        status: 404,
      });
    }
  });

  router.get('/:index/_search', (req, res) => {
    const { index } = req.params;
    logger.info(`Search: GET Querying index [${index}]`);
    try {
      const result = globalStore.search(index, req.body || {});
      res.json(result);
    } catch (error: any) {
      logger.error(`Search: GET Query failed on [${index}]: ${error.message}`);
      res.status(404).json({
        error: {
          root_cause: [{ type: 'index_not_found_exception', reason: error.message, index: index }],
          type: 'index_not_found_exception',
          reason: error.message,
          index: index,
        },
        status: 404,
      });
    }
  });

  // Global Search
  router.post('/_search', (req, res) => {
    logger.info(`Search: Global query across all indices`);
    const indices = globalStore.getAllIndices();
    let allHits: any[] = [];
    indices.forEach((idx) => {
      try {
        const result = globalStore.search(idx.name, req.body || {});
        allHits = allHits.concat(result.hits.hits);
      } catch (e) {
        // Skip
      }
    });

    const size = req.body?.size || 10;
    const from = req.body?.from || 0;
    const paginatedHits = allHits.slice(from, from + size);

    res.json({
      took: 1,
      timed_out: false,
      _shards: { total: indices.length, successful: indices.length, skipped: 0, failed: 0 },
      hits: {
        total: { value: allHits.length, relation: 'eq' },
        max_score: allHits.length > 0 ? 1.0 : null,
        hits: paginatedHits,
      },
    });
  });

  return router;
}
