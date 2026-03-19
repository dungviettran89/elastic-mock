import { Router } from 'express';
import { globalStore } from './store.js';
import { logger } from './logger.js';

export function createDocumentRouter() {
  const router = Router();

  // Index Document with ID
  router.put('/:index/_doc/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: Indexing [${id}] in [${index}]`);
    try {
      const result = globalStore.indexDocument(index, id, req.body);
      const statusCode = result.result === 'created' ? 201 : 200;
      res.status(statusCode).json(result);
    } catch (error: any) {
      logger.error(`Documents: Failed to index [${id}] in [${index}]: ${error.message}`);
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

  router.put('/:index/_create/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: Creating [${id}] in [${index}]`);
    try {
      // op_type=create should fail if exists, but for mock we just index
      const result = globalStore.indexDocument(index, id, req.body);
      res.status(201).json(result);
    } catch (error: any) {
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

  // Validate Query API
  router.post(['/_validate/query', '/:index/_validate/query'], (req, res) => {
    res.json({
      valid: true,
      _shards: { total: 1, successful: 1, failed: 0 },
    });
  });

  // Index Document without ID (POST)
  router.post('/:index/_doc', (req, res) => {
    const { index } = req.params;
    logger.info(`Documents: Auto-indexing in [${index}]`);
    try {
      const result = globalStore.indexDocument(index, undefined, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      logger.error(`Documents: Failed to auto-index in [${index}]: ${error.message}`);
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

  // Get Document
  router.get('/:index/_doc/:id', (req, res) => {
    const { index, id } = req.params;
    const result = globalStore.getDocument(index, id);
    if (!result) {
      logger.warn(`Documents: Get failed, index [${index}] not found`);
      return res.status(404).json({
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
    if (!result.found) {
      logger.warn(`Documents: Document [${id}] not found in [${index}]`);
      return res.status(404).json(result);
    }
    res.json(result);
  });

  // HEAD Document
  router.head('/:index/_doc/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: HEAD request for [${id}] in [${index}]`);
    const result = globalStore.getDocument(index, id);
    if (!result || !result.found) {
      return res.status(404).end();
    }
    res.status(200).end();
  });

  // HEAD Document Source
  router.head('/:index/_source/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: HEAD source request for [${id}] in [${index}]`);
    const result = globalStore.getDocument(index, id);
    if (!result || !result.found) {
      return res.status(404).end();
    }
    res.status(200).end();
  });

  // GET Document Source
  router.get('/:index/_source/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: GET source request for [${id}] in [${index}]`);
    const result = globalStore.getDocument(index, id);
    if (!result || !result.found) {
      return res.status(404).end();
    }
    res.json(result._source);
  });

  // Multi Get API
  const handleMget = (req: any, res: any) => {
    logger.info(`Documents: mget request`);
    const result = globalStore.mget(req.body);
    res.json(result);
  };
  router.post('/_mget', handleMget);
  router.get('/_mget', handleMget);
  router.post('/:index/_mget', handleMget);
  router.get('/:index/_mget', handleMget);

  // Multi Search API
  const handleMsearch = (req: any, res: any) => {
    const { index } = req.params;
    logger.info(`Documents: msearch request`);
    let body = req.body;
    if (typeof body === 'string') {
      const lines = body.trim().split('\n');
      body = lines.map((l) => JSON.parse(l));
    }
    const result = globalStore.msearch(body, index);
    res.json(result);
  };
  router.post('/_msearch', handleMsearch);
  router.get('/_msearch', handleMsearch);
  router.post('/:index/_msearch', handleMsearch);
  router.get('/:index/_msearch', handleMsearch);

  // Update By Query
  router.post('/_update_by_query', (req, res) => {
    const result = globalStore.updateByQuery('_all', req.body);
    res.json(result);
  });
  router.post('/:index/_update_by_query', (req, res) => {
    const { index } = req.params;
    const result = globalStore.updateByQuery(index, req.body);
    res.json(result);
  });

  // Delete By Query
  router.post('/_delete_by_query', (req, res) => {
    const result = globalStore.deleteByQuery('_all', req.body);
    res.json(result);
  });
  router.post('/:index/_delete_by_query', (req, res) => {
    const { index } = req.params;
    const result = globalStore.deleteByQuery(index, req.body);
    res.json(result);
  });

  // Update Document
  router.post('/:index/_update/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: Updating [${id}] in [${index}]`);
    try {
      const result = globalStore.updateDocument(index, id, req.body);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`Documents: Update failed for [${id}] in [${index}]: ${error.message}`);
      res.status(404).json({
        error: {
          root_cause: [
            { type: 'resource_not_found_exception', reason: error.message, index: index },
          ],
          type: 'resource_not_found_exception',
          reason: error.message,
          index: index,
        },
        status: 404,
      });
    }
  });

  // Delete Document
  router.delete('/:index/_doc/:id', (req, res) => {
    const { index, id } = req.params;
    logger.info(`Documents: Deleting [${id}] from [${index}]`);
    try {
      const result = globalStore.deleteDocument(index, id);
      if (!result.found) {
        logger.warn(`Documents: Delete failed, [${id}] not found in [${index}]`);
        return res.status(404).json(result);
      }
      res.status(200).json(result);
    } catch (error: any) {
      logger.error(`Documents: Delete error for [${id}] in [${index}]: ${error.message}`);
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

  // Count API
  router.get('/_count', (req, res) => {
    logger.info(`Documents: Global _count request`);
    const count = globalStore.getTotalDocCount();
    res.json({
      count,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    });
  });

  router.get('/:index/_count', (req, res) => {
    const { index } = req.params;
    logger.info(`Documents: _count request for [${index}]`);
    if (!globalStore.hasIndex(index)) {
      return res.status(404).json({
        error: {
          root_cause: [{ type: 'index_not_found_exception', reason: 'no such index', index: index }],
          type: 'index_not_found_exception',
          reason: 'no such index',
          index: index,
        },
        status: 404,
      });
    }
    const count = globalStore.getDocCount(index);
    res.json({
      count,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    });
  });

  // Bulk API
  const handleBulk = (req: any, res: any) => {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = body
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line) => JSON.parse(line));
      } catch (e: any) {
        logger.error(`Documents: Bulk parsing failed: ${e.message}`);
        return res.status(400).json({ error: 'Invalid NDJSON' });
      }
    }
    logger.info(`Documents: Processing bulk request (${body.length} lines)`);
    const result = globalStore.bulk(body);
    res.status(200).json(result);
  };

  router.post('/_bulk', handleBulk);
  router.post('/:index/_bulk', handleBulk);

  return router;
}
