import { Router } from 'express';

const watchStates = new Map<string, boolean>();
let watcherSettings = {
  auto_expand_replicas: '0-1',
  number_of_replicas: '0',
};

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
          watch_count: watchStates.size,
          execution_thread_pool: { queue_size: 0, max_size: 10 },
        },
      ],
    });
  });

  router.put('/_watcher/watch/:id', (req, res) => {
    watchStates.set(req.params.id, true);
    res.json({ _id: req.params.id, _version: 1, created: true });
  });

  router.delete('/_watcher/watch/:id', (req, res) => {
    const found = watchStates.has(req.params.id);
    watchStates.delete(req.params.id);
    res.json({ _id: req.params.id, _version: 1, found });
  });

  router.all('/_watcher/watch/:id/_ack', (req, res) => {
    res.json({
      status: {
        state: { active: watchStates.get(req.params.id) !== false },
        actions: {
          test_index: {
            ack: { state: 'awaits_successful_execution' },
          },
        },
      },
    });
  });

  router.get('/_watcher/watch/:id', (req, res) => {
    const active = watchStates.get(req.params.id) !== false;
    res.json({
      found: true,
      _id: req.params.id,
      status: {
        state: { active },
        actions: {
          test_index: {
            ack: { state: 'awaits_successful_execution' },
          },
        },
      },
    });
  });

  router.all('/_watcher/watch/:id/_deactivate', (req, res) => {
    watchStates.set(req.params.id, false);
    res.json({ status: { state: { active: false } } });
  });

  router.all('/_watcher/watch/:id/_activate', (req, res) => {
    watchStates.set(req.params.id, true);
    res.json({ status: { state: { active: true } } });
  });

  router.get('/_watcher/settings', (req, res) => {
    res.json({
      index: {
        auto_expand_replicas: watcherSettings.auto_expand_replicas,
        number_of_replicas: watcherSettings.number_of_replicas,
        routing: { allocation: { include: { _tier_preference: null } } },
      },
    });
  });

  router.all('/_watcher/settings', (req, res) => {
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = req.body || {};
      if (body.index) {
        if (body.index.auto_expand_replicas) {
          watcherSettings.auto_expand_replicas = body.index.auto_expand_replicas;
        }
        if (body.index.number_of_replicas) {
          watcherSettings.number_of_replicas = body.index.number_of_replicas;
        }
      } else {
        if (body['index.auto_expand_replicas']) {
          watcherSettings.auto_expand_replicas = body['index.auto_expand_replicas'];
        }
        if (body['index.number_of_replicas']) {
          watcherSettings.number_of_replicas = body['index.number_of_replicas'];
        }
      }
    }
    res.json({ acknowledged: true });
  });

  router.all('/_watcher/_stop', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.all('/_watcher/_start', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.all('/_watcher/_query/watches', (req, res) => {
    res.json({ count: 1, watches: [{ id: 'my-watch', watch: {} }] });
  });

  router.all('/_watcher/watch/:id/_execute', (req, res) => {
    const active = watchStates.get(req.params.id) !== false;
    res.json({
      watch_id: req.params.id,
      watch_record: {
        watch_id: req.params.id,
        state: 'executed',
        node: 'mock-node',
        trigger_event: {
          type: 'manual',
          triggered_time: '2012-12-12T12:12:12.120Z',
          manual: {
            schedule: {
              scheduled_time: '2000-12-12T12:12:12.120Z',
            },
          },
        },
        status: {
          execution_state: 'executed',
          state: { active },
        },
        result: {
          execution_duration: 100,
        },
      },
    });
  });

  return router;
}
