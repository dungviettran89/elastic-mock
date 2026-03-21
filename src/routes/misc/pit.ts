import { Router } from 'express';

export function createPitRouter() {
  const router = Router();

  router.post(['/_pit', '/:index/_pit'], (req, res) => {
    res.json({ id: 'mock-pit-id' });
  });

  router.delete('/_pit', (req, res) => {
    res.json({ succeeded: true, num_freed: 1 });
  });

  return router;
}
