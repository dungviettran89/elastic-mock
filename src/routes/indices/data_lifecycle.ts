import { Router } from 'express';

export function createDataLifecycleRouter() {
  const router = Router();

  router.get('/_lifecycle/stats', (req, res) => {
    res.json({
      data_streams: [],
    });
  });

  router.get('/:index/_lifecycle/explain', (req, res) => {
    res.json({
      indices: {
        [req.params.index]: {
          index: req.params.index,
          lifecycle: {
            managed: false,
          },
        },
      },
    });
  });

  return router;
}
