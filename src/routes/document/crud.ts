import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const crudRouter = Router();

// Index Document with ID
crudRouter.put('/:index/_doc/:id', (req, res) => {
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

crudRouter.put('/:index/_create/:id', (req, res) => {
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

// Index Document without ID (POST)
crudRouter.post('/:index/_doc', (req, res) => {
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
crudRouter.get('/:index/_doc/:id', (req, res) => {
  const { index, id } = req.params;
  const result = globalStore.getDocument(index, id);
  if (!result) {
    logger.warn(`Documents: Get failed, index [${index}] not found`);
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
  if (!result.found) {
    logger.warn(`Documents: Document [${id}] not found in [${index}]`);
    return res.status(404).json(result);
  }
  res.json(result);
});

// HEAD Document
crudRouter.head('/:index/_doc/:id', (req, res) => {
  const { index, id } = req.params;
  logger.info(`Documents: HEAD request for [${id}] in [${index}]`);
  const result = globalStore.getDocument(index, id);
  if (!result || !result.found) {
    return res.status(404).end();
  }
  res.status(200).end();
});

// HEAD Document Source
crudRouter.head('/:index/_source/:id', (req, res) => {
  const { index, id } = req.params;
  logger.info(`Documents: HEAD source request for [${id}] in [${index}]`);
  const result = globalStore.getDocument(index, id);
  if (!result || !result.found) {
    return res.status(404).end();
  }
  res.status(200).end();
});

// GET Document Source
crudRouter.get('/:index/_source/:id', (req, res) => {
  const { index, id } = req.params;
  logger.info(`Documents: GET source request for [${id}] in [${index}]`);
  const result = globalStore.getDocument(index, id);
  if (!result || !result.found) {
    return res.status(404).end();
  }
  res.json(result._source);
});

// Update Document
crudRouter.post('/:index/_update/:id', (req, res) => {
  const { index, id } = req.params;
  logger.info(`Documents: Updating [${id}] in [${index}]`);
  try {
    const result = globalStore.updateDocument(index, id, req.body);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Documents: Update failed for [${id}] in [${index}]: ${error.message}`);
    res.status(404).json({
      error: {
        root_cause: [{ type: 'resource_not_found_exception', reason: error.message, index: index }],
        type: 'resource_not_found_exception',
        reason: error.message,
        index: index,
      },
      status: 404,
    });
  }
});

// Delete Document
crudRouter.delete('/:index/_doc/:id', (req, res) => {
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

// Delete by Query API
crudRouter.post(['/_delete_by_query', '/:index/_delete_by_query'], (req, res) => {
  const { index } = req.params;
  try {
    const result = globalStore.deleteByQuery(index, req.body || {});
    res.json(result);
  } catch (error: any) {
    logger.error(`Documents: Delete by query failed in [${index}]: ${error.message}`);
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

// Update by Query API
crudRouter.post(['/_update_by_query', '/:index/_update_by_query'], (req, res) => {
  const { index } = req.params;
  const count = index ? globalStore.getDocCount(index) : globalStore.getTotalDocCount();
  res.json({
    took: 1,
    timed_out: false,
    total: count,
    updated: count,
    batches: 1,
    version_conflicts: 0,
    noops: 0,
    retries: { bulk: 0, search: 0 },
    throttled_millis: 0,
    requests_per_second: -1,
    throttled_until_millis: 0,
    failures: [],
  });
});
