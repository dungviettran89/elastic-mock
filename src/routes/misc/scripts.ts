import { Router } from 'express';

export function createScriptsRouter() {
  const router = Router();

  router.put(['/_scripts/:id', '/_scripts/:id/:context'], (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_scripts/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_scripts/:id', (req, res) => {
    res.json({
      _id: req.params.id,
      found: true,
      script: { lang: 'painless', source: 'return 1' },
    });
  });

  router.post('/_scripts/:lang/_execute', (req, res) => {
    const body = req.body || {};
    const script = body.script || {};
    const params = script.params || {};

    if (
      script.source &&
      script.source.includes('params.count') &&
      script.source.includes('params.total')
    ) {
      const count = params.count || 0;
      const total = params.total || 1;
      const result = count / total;
      res.json({ result });
    } else {
      res.json({ result: '1' });
    }
  });

  router.get('/_script_context', (req, res) => {
    res.json({
      contexts: [
        {
          name: 'score',
          methods: [{ name: 'execute', return_type: 'double', params: [] }],
        },
        {
          name: 'filter',
          methods: [{ name: 'execute', return_type: 'boolean', params: [] }],
        },
        {
          name: 'ingest',
          methods: [{ name: 'execute', return_type: 'void', params: [] }],
        },
      ],
    });
  });

  router.get('/_script_language', (req, res) => {
    res.json({
      languages: ['painless', 'mustache', 'expression'],
      types_allowed: ['inline', 'stored'],
      contexts: ['score', 'filter', 'ingest'],
    });
  });

  return router;
}
