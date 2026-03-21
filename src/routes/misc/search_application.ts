import { Router } from 'express';

export function createSearchApplicationRouter() {
  const router = Router();

  router.put('/_application/search_application/:name', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.get('/_application/search_application/:name', (req, res) => {
    res.json({
      name: req.params.name,
      updated_at_millis: Date.now(),
      template: { script: { source: '{"match_all": {}}' } },
    });
  });

  router.delete('/_application/search_application/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_application/search_application', (req, res) => {
    res.json({ count: 1, search_applications: [{ name: 'search_app' }] });
  });

  router.post('/_application/search_application/:name/_search', (req, res) => {
    res.json({
      hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
    });
  });

  router.get('/_application/analytics/:name', (req, res) => {
    res.json({ 
      name: req.params.name, 
      created_at_millis: Date.now(),
      behavioral_analytics: true,
    });
  });

  router.put('/_application/analytics/:name', (req, res) => {
    res.json({ acknowledged: true, result: 'created', name: req.params.name });
  });

  router.delete('/_application/analytics/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_application/analytics/:collection_name/event/:event_type', (req, res) => {
    res.json({ accepted: true });
  });

  router.post('/_application/search_application/:name/_render_query', (req, res) => {
    res.json({ query: { term: { field2: { value: 'value1' } } } });
  });

  return router;
}
