import { Router } from 'express';
import { crudRouter } from './crud.js';
import { multiRouter } from './multi.js';
import { queryRouter } from './query.js';
import { searchRouter } from './search.js';
import { bulkRouter } from './bulk.js';

export function createDocumentRouter() {
  const router = Router();

  router.use(crudRouter);
  router.use(multiRouter);
  router.use(queryRouter);
  router.use(searchRouter);
  router.use(bulkRouter);

  return router;
}
