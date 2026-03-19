import { Router } from 'express';
import { coreRouter } from './core.js';
import { miscRouter } from './misc.js';

export function createCatRouter() {
  const router = Router();

  router.use(coreRouter);
  router.use(miscRouter);

  return router;
}
