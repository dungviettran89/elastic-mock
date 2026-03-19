import { Router } from 'express';
import { coreRouter } from './core.js';
import { aliasesRouter } from './aliases.js';
import { mappingRouter } from './mapping.js';

export function createIndicesRouter() {
  const router = Router();

  router.use(coreRouter);
  router.use(aliasesRouter);
  router.use(mappingRouter);

  return router;
}
