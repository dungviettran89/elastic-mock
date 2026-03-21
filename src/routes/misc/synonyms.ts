import { Router } from 'express';
import { globalStore } from '../../store.js';

export function createSynonymsRouter() {
  const router = Router();

  router.put('/_synonyms/:id', (req, res) => {
    const result = globalStore.putSynonymSet(req.params.id, req.body);
    res.json(result);
  });

  router.get('/_synonyms/:id?', (req, res) => {
    const { id } = req.params;
    if (id) {
      const set = globalStore.getSynonymSet(id);
      if (set) {
        res.json(set);
      } else {
        res.status(404).json({ error: 'synonym_set_not_found' });
      }
    } else {
      res.json({
        count: globalStore.getAllSynonymSets().length,
        results: globalStore.getAllSynonymSets(),
      });
    }
  });

  router.delete('/_synonyms/:id', (req, res) => {
    globalStore.deleteSynonymSet(req.params.id);
    res.json({ acknowledged: true });
  });

  router.put('/_synonyms/:set_id/_rule/:rule_id', (req, res) => {
    const result = globalStore.putSynonymRule(req.params.set_id, req.params.rule_id, req.body);
    res.json(result);
  });

  router.put('/_synonyms/:set_id/:rule_id', (req, res) => {
    const result = globalStore.putSynonymRule(req.params.set_id, req.params.rule_id, req.body);
    res.json(result);
  });

  router.get('/_synonyms/:set_id/_rule/:rule_id', (req, res) => {
    const rule = globalStore.getSynonymRule(req.params.set_id, req.params.rule_id);
    if (rule) {
      res.json(rule);
    } else {
      res.status(404).json({ error: 'synonym_rule_not_found' });
    }
  });

  router.get('/_synonyms/:set_id/:rule_id', (req, res) => {
    const rule = globalStore.getSynonymRule(req.params.set_id, req.params.rule_id);
    if (rule) {
      res.json(rule);
    } else {
      res.status(404).json({ error: 'synonym_rule_not_found' });
    }
  });

  router.delete('/_synonyms/:set_id/_rule/:rule_id', (req, res) => {
    const result = globalStore.deleteSynonymRule(req.params.set_id, req.params.rule_id);
    res.json({ result: result ? 'deleted' : 'not_found' });
  });

  router.delete('/_synonyms/:set_id/:rule_id', (req, res) => {
    const result = globalStore.deleteSynonymRule(req.params.set_id, req.params.rule_id);
    res.json({ result: result ? 'deleted' : 'not_found' });
  });

  return router;
}
