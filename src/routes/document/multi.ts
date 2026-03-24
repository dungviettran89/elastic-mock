import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const multiRouter = Router();

// Multi Get API
const handleMget = (req: any, res: any) => {
  logger.info(`Documents: mget request`);
  const result = globalStore.mget(req.body);
  res.json(result);
};
multiRouter.post('/_mget', handleMget);
multiRouter.get('/_mget', handleMget);
multiRouter.post('/:index/_mget', handleMget);
multiRouter.get('/:index/_mget', handleMget);

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
multiRouter.post('/_msearch', handleMsearch);
multiRouter.get('/_msearch', handleMsearch);
multiRouter.post('/:index/_msearch', handleMsearch);
multiRouter.get('/:index/_msearch', handleMsearch);

// Multi Term Vectors
multiRouter.post(['/_mtermvectors', '/:index/_mtermvectors'], (req, res) => {
  res.json({
    docs: [
      {
        _index: req.params.index || 'mock-index',
        _id: 'mock-id',
        found: true,
        term_vectors: {
          text: {
            field_statistics: { sum_doc_freq: 2, doc_count: 1, sum_ttf: 2 },
            terms: {
              brown: {
                doc_freq: 1,
                ttf: 2,
                term_freq: 2,
                tokens: [
                  { position: 2, start_offset: 10, end_offset: 15 },
                  { position: 5, start_offset: 25, end_offset: 30 },
                ],
              },
            },
          },
        },
      },
    ],
  });
});

export const multiRouterExport = multiRouter;
