import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const searchRouter = Router();

// Validate Query API
searchRouter.post(['/_validate/query', '/:index/_validate/query'], (req, res) => {
  res.json({
    valid: true,
    _shards: { total: 1, successful: 1, failed: 0 },
  });
});

// Count API
searchRouter.get('/_count', (req, res) => {
  logger.info(`Documents: Global _count request`);
  const count = globalStore.getTotalDocCount();
  res.json({
    count,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  });
});

searchRouter.get('/:index/_count', (req, res) => {
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

// Term Vectors API
searchRouter.post(['/_mtermvectors', '/:index/_mtermvectors'], (req, res) => {
  res.json({
    docs: [],
  });
});

searchRouter.get(['/:index/_termvectors/:id', '/:index/_termvectors'], (req, res) => {
  const { index, id } = req.params;
  res.json({
    _index: index,
    _id: id || 'mock-id',
    _version: 1,
    found: true,
    took: 1,
    term_vectors: {},
  });
});

// Scroll Search API
searchRouter.post(['/_search/scroll', '/_search/scroll/:scroll_id'], (req, res) => {
  res.json({
    _scroll_id: req.params.scroll_id || req.body?.scroll_id || 'mock-scroll-id',
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
  });
});

searchRouter.delete(['/_search/scroll', '/_search/scroll/:scroll_id'], (req, res) => {
  res.json({ succeeded: true, num_freed: 1 });
});

// Multi Search Template API
searchRouter.post(['/_msearch/template', '/:index/_msearch/template'], (req, res) => {
  res.json({
    responses: [],
  });
});

// Rank Eval API
searchRouter.post(['/_rank_eval', '/:index/_rank_eval'], (req, res) => {
  res.json({
    metric_score: 1.0,
    details: {},
  });
});
