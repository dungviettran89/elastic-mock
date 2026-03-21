import { Router } from 'express';

export function createSqlRouter() {
  const router = Router();

  router.post(['/_sql', '/_sql/translate', '/_sql/close'], (req, res) => {
    res.json({
      columns: [],
      rows: [],
      sql: 'SELECT 1',
      size: true,
      acknowledged: true,
      succeeded: true,
    });
  });

  router.get(['/_sql/async/status/:id', '/_sql/async/:id'], (req, res) => {
    res.json({
      id: req.params.id || 'mock-id',
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      completion_status: 200,
      response: { columns: [], rows: [] },
    });
  });

  router.delete('/_sql/async/delete/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
