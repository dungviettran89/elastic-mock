import { Router } from 'express';

export function createInferenceRouter() {
  const router = Router();

  router.put('/_inference/:inference_id', (req, res) => {
    const body = req.body || {};
    res.json({
      task_type: body.task_type || 'sparse_embedding',
      inference_id: req.params.inference_id,
      service: body.service || 'elser',
      service_settings: body.service_settings || { num_allocations: 1, num_threads: 1 },
    });
  });

  router.get('/_inference/:inference_id?', (req, res) => {
    const inferenceId = req.params.inference_id || 'elser_model_test';
    res.json({
      endpoints: [{ task_type: 'sparse_embedding', inference_id: inferenceId, service: 'elser' }],
    });
  });

  router.delete('/_inference/:inference_id', (req, res) => {
    res.json({ acknowledged: true });
  });

  return router;
}
