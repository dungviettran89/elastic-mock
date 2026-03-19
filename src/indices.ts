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

  // Alias APIs
  router.put('/:index/_alias/:name', (req, res) => {
    const { index, name } = req.params;
    logger.info(`Indices: Adding alias [${name}] to [${index}]`);
    try {
      globalStore.addAlias(index, name);
      res.status(200).json({ acknowledged: true });
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

  router.delete('/:index/_alias/:name', (req, res) => {
    const { index, name } = req.params;
    logger.info(`Indices: Removing alias [${name}] from [${index}]`);
    globalStore.removeAlias(index, name);
    res.status(200).json({ acknowledged: true });
  });

  router.post('/_aliases', (req, res) => {
    const { actions } = req.body;
    logger.info(`Indices: Processing [${actions?.length || 0}] alias actions`);
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        if (action.add) {
          globalStore.addAlias(action.add.index, action.add.alias);
        } else if (action.remove) {
          globalStore.removeAlias(action.remove.index, action.remove.alias);
        }
      }
    }
    res.status(200).json({ acknowledged: true });
  });

  router.get('/_alias', (req, res) => {
    const result: any = {};
    for (const index of globalStore.getAllIndices()) {
      result[index.name] = {
        aliases: Object.fromEntries(Array.from(index.aliases).map((a) => [a, {}])),
      };
    }
    res.json(result);
  });

  router.get('/_alias/:name', (req, res) => {
    const { name } = req.params;
    const result: any = {};
    let found = false;

    for (const index of globalStore.getAllIndices()) {
      if (index.aliases.has(name)) {
        found = true;
        result[index.name] = {
          aliases: { [name]: {} },
        };
      }
    }

    if (found) {
      res.json(result);
    } else {
      res.status(404).json({
        error: {
          root_cause: [{ type: 'alias_not_found_exception', reason: 'no such alias', alias: name }],
          type: 'alias_not_found_exception',
          reason: 'no such alias',
          alias: name,
        },
        status: 404,
      });
    }
  });

  router.get('/:index/_alias', (req, res) => {
    const { index } = req.params;
    const state = globalStore.getIndex(index);
    if (state) {
      res.json({
        [state.name]: {
          aliases: Object.fromEntries(Array.from(state.aliases).map((a) => [a, {}])),
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

  // Refresh API
  router.post('/_refresh', (req, res) => {
    logger.info(`Indices: Global refresh request`);
    res.status(200).json({
      _shards: { total: 1, successful: 1, failed: 0 },
    });
  });

  router.post('/:index/_refresh', (req, res) => {
    const { index } = req.params;
    logger.info(`Indices: Refresh request for [${index}]`);
    res.status(200).json({
      _shards: { total: 1, successful: 1, failed: 0 },
    });
  });

  // Get Mapping
  router.get('/:index/_mapping', (req, res) => {
    const { index } = req.params;
    const state = globalStore.getIndex(index);
    if (state) {
      res.json({
        [state.name]: {
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

  router.put('/:index/_mapping', (req, res) => {
    const { index } = req.params;
    logger.info(`Indices: Updating mapping for [${index}]`);
    try {
      globalStore.updateMapping(index, req.body);
      res.status(200).json({ acknowledged: true });
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

  // Resolve Index API
  router.get('/_resolve/index/:name', (req, res) => {
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

  return router;
}
