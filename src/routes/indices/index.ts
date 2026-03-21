import { Router } from 'express';
import { coreRouter } from './core.js';
import { aliasesRouter } from './aliases.js';
import { mappingRouter } from './mapping.js';
import { createDataLifecycleRouter } from './data_lifecycle.js';

export function createIndicesRouter() {
  const router = Router();
  const dataLifecycleRouter = createDataLifecycleRouter();

  router.use(coreRouter);
  router.use(aliasesRouter);
  router.use(mappingRouter);
  router.use(dataLifecycleRouter);

  return router;
}
