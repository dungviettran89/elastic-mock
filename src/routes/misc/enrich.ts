import { Router } from 'express';

export function createEnrichRouter() {
  const router = Router();

  router.put('/_enrich/policy/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_enrich/policy/:name?', (req, res) => {
    const name = req.params.name || 'policy_test';
    res.json({
      policies: [
        {
          config: {
            match: {
              name: name,
              indices: ['enrich_tests*'],
              match_field: 'baz',
              enrich_fields: ['a', 'b'],
            },
          },
        },
      ],
    });
  });

  router.delete('/_enrich/policy/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post(['/_enrich/policy/:name/_execute', '/_enrich/policy/:name/_execute'], (req, res) => {
    res.json({ status: { phase: 'COMPLETE' } });
  });

  router.put('/_enrich/policy/:name/_execute', (req, res) => {
    res.json({ status: { phase: 'COMPLETE' } });
  });

  router.get('/_enrich/_stats', (req, res) => {
    res.json({ executing_policies: [], coordinator_stats: [] });
  });

  return router;
}
