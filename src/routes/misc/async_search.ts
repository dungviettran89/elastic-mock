import { Router } from 'express';
import { globalStore } from '../../store.js';

export function createAsyncSearchRouter() {
  const router = Router();

  router.post(['/:index/_async_search', '/_async_search'], (req, res) => {
    const { index } = req.params;
    let searchResponse: any;
    try {
      if (index) {
        searchResponse = globalStore.search(index, { ...req.query, ...req.body });
      } else {
        const indices = globalStore.getAllIndices();
        let allHits: any[] = [];
        indices.forEach((idx: any) => {
          try {
            const result = globalStore.search(idx.name, { ...req.query, ...req.body });
            allHits = allHits.concat(result.hits.hits);
          } catch (e) {}
        });
        const size = req.body?.size || 10;
        searchResponse = {
          took: 1,
          timed_out: false,
          _shards: { total: indices.length, successful: indices.length, skipped: 0, failed: 0 },
          hits: {
            total: { value: allHits.length, relation: 'eq' },
            max_score: allHits.length > 0 ? 1.0 : null,
            hits: allHits.slice(0, size),
          },
        };
      }
    } catch (e) {
      searchResponse = {
        took: 1,
        timed_out: false,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      };
    }

    res.json({
      id: 'mock-async-search-id',
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      response: searchResponse,
    });
  });

  router.get('/_async_search/:id', (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
      response: {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 1.0,
          hits: [
            {
              _index: 'async_search_test_10',
              _id: '43',
              _score: 1.0,
              _source: { name: 'Bestiario', author: 'Julio Cortazar' },
            },
          ],
        },
      },
    });
  });

  router.get('/_async_search/status/:id', (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
    });
  });

  router.delete('/_async_search/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
