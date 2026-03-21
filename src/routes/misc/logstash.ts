import { Router } from 'express';

export function createLogstashRouter() {
  const router = Router();

  router.put('/_logstash/pipeline/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_logstash/pipeline/:id?', (req, res) => {
    const id = req.params.id;
    if (id) {
      res.json({
        [id]: {
          description: 'Sample pipeline',
          last_modified: '2021-01-02T02:50:51.250Z',
          pipeline_metadata: { type: 'logstash_pipeline', version: '1' },
          username: 'elastic',
          pipeline: 'input {}\n filter { grok {} }\n output {}',
          pipeline_settings: {
            'pipeline.workers': 1,
            'pipeline.batch.size': 125,
            'pipeline.batch.delay': 50,
            'queue.type': 'memory',
            'queue.max_bytes': '1gb',
            'queue.checkpoint.writes': 1024,
          },
        },
      });
    } else {
      res.json({});
    }
  });

  router.delete('/_logstash/pipeline/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
