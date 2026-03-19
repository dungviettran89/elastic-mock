import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const mappingRouter = Router();

// Get Mapping
mappingRouter.get('/:index/_mapping', (req, res) => {
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
        root_cause: [{ type: 'index_not_found_exception', reason: 'no such index', index: index }],
        type: 'index_not_found_exception',
        reason: 'no such index',
        index: index,
      },
      status: 404,
    });
  }
});

mappingRouter.post('/:index/_mapping', (req, res) => {
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
