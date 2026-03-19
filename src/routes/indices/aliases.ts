import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const aliasesRouter = Router();

// Alias APIs
aliasesRouter.put('/:index/_alias/:name', (req, res) => {
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

aliasesRouter.delete('/:index/_alias/:name', (req, res) => {
  const { index, name } = req.params;
  logger.info(`Indices: Removing alias [${name}] from [${index}]`);
  globalStore.removeAlias(index, name);
  res.status(200).json({ acknowledged: true });
});

aliasesRouter.post('/_aliases', (req, res) => {
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

aliasesRouter.get('/_alias', (req, res) => {
  const result: any = {};
  for (const index of globalStore.getAllIndices()) {
    result[index.name] = {
      aliases: Object.fromEntries(Array.from(index.aliases).map((a) => [a, {}])),
    };
  }
  res.json(result);
});

aliasesRouter.get('/_alias/:name', (req, res) => {
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

aliasesRouter.get('/:index/_alias', (req, res) => {
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
        root_cause: [{ type: 'index_not_found_exception', reason: 'no such index', index: index }],
        type: 'index_not_found_exception',
        reason: 'no such index',
        index: index,
      },
      status: 404,
    });
  }
});
