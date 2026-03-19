import { Router } from 'express';
import { globalStore } from '../../store.js';

export const queryRouter = Router();

// Update By Query
queryRouter.post('/_update_by_query', (req, res) => {
  const result = globalStore.updateByQuery('_all', req.body);
  res.json(result);
});
queryRouter.post('/:index/_update_by_query', (req, res) => {
  const { index } = req.params;
  const result = globalStore.updateByQuery(index, req.body);
  res.json(result);
});

// Delete By Query
queryRouter.post('/_delete_by_query', (req, res) => {
  const result = globalStore.deleteByQuery('_all', req.body);
  res.json(result);
});
queryRouter.post('/:index/_delete_by_query', (req, res) => {
  const { index } = req.params;
  const result = globalStore.deleteByQuery(index, req.body);
  res.json(result);
});
