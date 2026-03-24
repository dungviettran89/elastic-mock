import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const searchRouter = Router();

// Index Specific Search
searchRouter.post('/:index/_search', (req, res) => {
  const { index } = req.params;
  logger.info(`Search: Querying index [${index}]`);
  try {
    const result = globalStore.search(index, { ...req.query, ...req.body });
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

searchRouter.get('/:index/_search', (req, res) => {
  const { index } = req.params;
  logger.info(`Search: GET Querying index [${index}]`);
  try {
    const result = globalStore.search(index, { ...req.query, ...req.body });
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
searchRouter.post('/_search', (req, res) => {
  logger.info(`Search: Global query across all indices`);
  const indices = globalStore.getAllIndices();
  let allHits: any[] = [];
  indices.forEach((idx) => {
    try {
      const result = globalStore.search(idx.name, { ...req.query, ...req.body });
      allHits = allHits.concat(result.hits.hits);
    } catch (e) {
      // Skip
    }
  });

  const size = req.body?.size || 10;
  const from = req.body?.from || 0;
  const paginatedHits = allHits.slice(from, from + size);

  const response: any = {
    took: 1,
    timed_out: false,
    _shards: { total: indices.length, successful: indices.length, skipped: 0, failed: 0 },
    hits: {
      total:
        req.query.rest_total_hits_as_int === 'true'
          ? allHits.length
          : { value: allHits.length, relation: 'eq' },
      max_score: allHits.length > 0 ? 1.0 : null,
      hits: paginatedHits,
    },
  };

  if (req.body?.pit) {
    response.pit_id = req.body.pit.id;
  }

  res.json(response);
});

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

// Search Template API
searchRouter.post(['/_search/template', '/:index/_search/template'], (req, res) => {
  res.json({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
  });
});

searchRouter.get(['/_search/template', '/:index/_search/template'], (req, res) => {
  res.json({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
  });
});

// Render Search Template API
searchRouter.post(['/_render/template', '/_render/template/:id'], (req, res) => {
  res.json({
    template_output: { query: { match_all: {} } },
  });
});

// Multi Search Template API
searchRouter.post(['/_msearch/template', '/:index/_msearch/template'], (req, res) => {
  res.json({
    took: 1,
    responses: [
      {
        status: 200,
        took: 1,
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      },
    ],
  });
});

// Rank Eval API
searchRouter.post(['/_rank_eval', '/:index/_rank_eval'], (req, res) => {
  const index = req.params.index || 'my-index-000001';
  res.json({
    metric_score: 1.0,
    details: {
      amsterdam_query: {
        metric_score: 1.0,
        unrated_hits: [],
        hits: [
          {
            hit: { _index: index, _id: '1', _score: 1.0 },
            rating: 1,
          },
        ],
      },
    },
  });
});
