import { Router } from 'express';

export function createWatcherRouter() {
  const router = Router();

  router.get('/_watcher/stats', (req, res) => {
    res.json({
      _nodes: { total: 1, successful: 1, failed: 0 },
      cluster_name: 'elastic-mock',
      manually_stopped: false,
      stats: [
        {
          node_id: 'mock-node-id',
          status: 'started',
          watcher_state: 'started',
          watch_count: 0,
          execution_thread_pool: { queue_size: 0, max_size: 10 },
        },
      ],
    });
  });

  router.put('/_watcher/watch/:id', (req, res) => {
    res.json({ _id: req.params.id, _version: 1, created: true });
  });

  router.delete('/_watcher/watch/:id', (req, res) => {
    res.json({ _id: req.params.id, _version: 1, found: true });
  });

  router.post('/_watcher/watch/:id/_ack', (req, res) => {
    res.json({ status: { state: { active: true } } });
  });

  router.post('/_watcher/_query/watches', (req, res) => {
    res.json({ count: 1, watches: [{ id: 'my-watch', watch: {} }] });
  });

  router.put('/_watcher/watch/:id/_execute', (req, res) => {
    res.json({
      watch_id: req.params.id,
      watch_record: { watch_id: req.params.id, state: 'executed' },
    });
  });

  router.post('/_watcher/watch/:id/_execute', (req, res) => {
    res.json({
      watch_id: req.params.id,
      watch_record: { watch_id: req.params.id, state: 'executed' },
    });
  });

  return router;
}
