import { Router } from 'express';

export function createQueryRulesRouter() {
  const router = Router();

  router.put('/_query_rules/:id', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.put('/_query_rules/:id/_rule/:rule_id', (req, res) => {
    res.json({ acknowledged: true, result: 'created' });
  });

  router.get('/_query_rules/:ruleset_id/_rule/:rule_id', (req, res) => {
    res.json({
      ruleset_id: req.params.ruleset_id,
      rule_id: req.params.rule_id,
      type: 'pinned',
      criteria: [],
      actions: [],
    });
  });

  router.get('/_query_rules/:id?', (req, res) => {
    const id = req.params.id;
    if (id) {
      res.json({
        ruleset_id: id,
        rules: [
          { rule_id: 'my-rule1', type: 'pinned', criteria: [], actions: { ids: ['id1', 'id2'] } },
        ],
      });
    } else {
      res.json({ count: 1, results: [{ ruleset_id: 'query_ruleset_testing', rules: [] }] });
    }
  });

  router.delete('/_query_rules/:id/_rule/:rule_id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_query_rules/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_query_rules/:ruleset_id/_test', (req, res) => {
    const body = req.body || {};
    const matchCriteria = body.match_criteria || {};

    // Check if ruleset exists (mock: only test-ruleset exists)
    if (req.params.ruleset_id === 'nonexistent-ruleset') {
      if (Object.keys(matchCriteria).length === 0) {
        return res.status(400).json({
          error: {
            type: 'bad_request',
            reason: 'Invalid request',
          },
        });
      }
      return res.status(404).json({
        error: {
          type: 'resource_not_found_exception',
          reason: 'Ruleset not found',
        },
      });
    }

    // Mock response for test-ruleset
    res.json({
      total_matched_rules: 2,
      matched_rules: [{ rule_id: 'rule1' }, { rule_id: 'rule5' }],
    });
  });

  return router;
}
