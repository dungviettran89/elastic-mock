import { Router } from 'express';

export function createTransformRouter() {
  const router = Router();

  router.put('/_transform/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_transform/:id/_update', (req, res) => {
    res.json({ id: req.params.id, acknowledged: true });
  });

  router.post(
    ['/_transform/:id/_start', '/_transform/:id/_stop'],
    (req, res) => {
      res.json({ acknowledged: true });
    },
  );

  // Upgrade transforms endpoint
  router.post('/_transform/_upgrade', (req, res) => {
    res.json({ no_action: 1 });
  });

  // Get node stats endpoint
  router.get('/_transform/_node_stats', (req, res) => {
    res.json({
      total: true,
      nodes: [
        {
          node_id: 'node-1',
          name: 'node-1',
          transforms_count: 0,
        },
      ],
    });
  });

  router.post('/_transform/:id/_preview', (req, res) => {
    res.json({ preview: [] });
  });

  router.get('/_transform/:id/_preview', (req, res) => {
    res.json({ preview: [] });
  });

  router.post(['/_transform/:id/_schedule_now', '/_transform/:id/_reset'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_transform/:id/_stats', (req, res) => {
    const id = req.params.id || 'population';
    res.json({
      count: 1,
      transforms: [{ id: id, state: 'started' }],
    });
  });

  router.get('/_transform/:id?', (req, res) => {
    const id = req.params.id || 'population';
    res.json({
      count: 1,
      transforms: [{ id: id, state: 'started' }],
    });
  });

  router.delete('/_transform/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
