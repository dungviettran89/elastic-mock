import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const coreRouter = Router();

// Create Index
coreRouter.put('/:index', (req, res) => {
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
coreRouter.head('/:index', (req, res) => {
  const { index } = req.params;
  if (globalStore.hasIndex(index)) {
    res.status(200).end();
  } else {
    res.status(404).end();
  }
});

// Delete Index
coreRouter.delete('/:index', (req, res) => {
  const { index } = req.params;
  logger.info(`Indices: Deleting index [${index}]`);
  if (globalStore.deleteIndex(index)) {
    res.status(200).json({ acknowledged: true });
  } else {
    logger.warn(`Indices: Delete failed, index [${index}] not found`);
    res.status(404).json({
      error: {
        root_cause: [{ type: 'index_not_found_exception', reason: 'no such index', index: index }],
        type: 'index_not_found_exception',
        reason: 'no such index',
        index: index,
      },
      status: 404,
    });
  }
});

// Refresh API
coreRouter.post(['/_refresh', '/:index/_refresh'], (req, res) => {
  logger.info(`Indices: Refresh request`);
  res.status(200).json({
    _shards: { total: 1, successful: 1, failed: 0 },
  });
});

coreRouter.get(['/_refresh', '/:index/_refresh'], (req, res) => {
  res.status(200).json({
    _shards: { total: 1, successful: 1, failed: 0 },
  });
});

// Stats API
coreRouter.get(['/_stats', '/:index/_stats'], (req, res) => {
  res.json({
    _shards: { total: 1, successful: 1, failed: 0 },
    _all: { primaries: {}, total: {} },
    indices: {},
  });
});

// Resolve Index API
coreRouter.get('/_resolve/index/:name', (req, res) => {
  const { name } = req.params;
  logger.info(`Indices: Resolving index pattern [${name}]`);

  const matches: any[] = [];
  const pattern = name.replace(/\*/g, '.*');
  const regex = new RegExp(`^${pattern}$`);

  for (const index of globalStore.getAllIndices()) {
    let isMatch = regex.test(index.name);
    if (!isMatch) {
      for (const alias of index.aliases) {
        if (regex.test(alias)) {
          isMatch = true;
          break;
        }
      }
    }

    if (isMatch) {
      matches.push({
        name: index.name,
        attributes: ['open'],
        aliases: Array.from(index.aliases),
      });
    }
  }

  res.json({ indices: matches });
});
