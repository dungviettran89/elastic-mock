import { Router } from 'express';

export function createIlmRouter() {
  const router = Router();

  router.put(['/_ilm/policy/:policy', '/_ilm/policy'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ilm/policy/:policy?', (req, res) => {
    const policy = req.params.policy;
    if (policy) {
      res.json({
        [policy]: {
          version: 1,
          modified_date_in_millis: Date.now(),
          policy: {
            phases: {
              hot: { min_age: '0ms', actions: { rollover: { max_age: '30d', max_size: '50gb' } } },
            },
          },
        },
      });
    } else {
      res.json({});
    }
  });

  router.get(['/:index/_ilm/explain', '/_ilm/explain'], (req, res) => {
    const index = req.params.index || 'logs-foobar';
    res.json({
      indices: {
        [index]: {
          index: index,
          managed: true,
          policy: 'my_lifecycle',
          lifecycle_date_millis: Date.now(),
          age: '10s',
          phase: 'hot',
          phase_time_millis: Date.now(),
          action: 'rollover',
          action_time_millis: Date.now(),
          step: 'check-rollover-ready',
          step_time_millis: Date.now(),
        },
      },
    });
  });

  router.get('/_ilm/status', (req, res) => {
    res.json({ operation_mode: 'RUNNING' });
  });

  router.post('/_ilm/start', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_ilm/stop', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post(['/:index/_ilm/remove', '/_ilm/remove'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_ilm/policy/:policy', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
