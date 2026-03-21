import { Router } from 'express';

export function createEqlRouter() {
  const router = Router();

  router.post('/:index/_eql/search', (req, res) => {
    res.json({
      id: 'mock-eql-search-id',
      hits: {
        total: { value: 3, relation: 'eq' },
        hits: [
          { _index: req.params.index, _type: '_doc', _id: '1', _source: {} },
          { _index: req.params.index, _type: '_doc', _id: '2', _source: {} },
          { _index: req.params.index, _type: '_doc', _id: '3', _source: {} },
        ],
      },
      took: 1,
      timed_out: false,
    });
  });

  router.get('/_eql/search/:id', (req, res) => {
    res.json({
      id: req.params.id,
      hits: {
        total: { value: 3, relation: 'eq' },
        hits: [
          { _index: 'test-index', _type: '_doc', _id: '1', _source: {} },
          { _index: 'test-index', _type: '_doc', _id: '2', _source: {} },
          { _index: 'test-index', _type: '_doc', _id: '3', _source: {} },
        ],
      },
      took: 1,
      timed_out: false,
    });
  });

  router.get('/_eql/search/status/:id', (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 1000 * 60 * 60,
    });
  });

  router.delete('/_eql/search/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
