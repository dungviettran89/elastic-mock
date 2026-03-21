import { Router } from 'express';
import { globalStore } from '../../store.js';

// In-memory store for ip_location databases
const ipLocationDatabases = new Map<string, any>();

export function createIngestRouter() {
  const router = Router();

  router.put('/_ingest/pipeline/:id', (req, res) => {
    globalStore.putPipeline(req.params.id, req.body);
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/pipeline/:id?', (req, res) => {
    const { id } = req.params;
    if (id) {
      const pipeline = globalStore.getPipeline(id);
      if (pipeline) {
        res.json({ [id]: pipeline });
      } else {
        res.status(404).json({ error: 'pipeline_missing_exception' });
      }
    } else {
      const pipelines = globalStore.getAllPipelines();
      res.json(Object.fromEntries(pipelines));
    }
  });

  router.delete('/_ingest/pipeline/:id', (req, res) => {
    globalStore.deletePipeline(req.params.id);
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/geoip/stats', (req, res) => {
    res.json({
      stats: {
        successful_downloads: 0,
        failed_downloads: 0,
        skipped_updates: 0,
        databases_count: 0,
        total_download_time: 0,
      },
      nodes: { 'mock-node-id': { databases: [] } },
    });
  });

  router.put('/_ingest/ip_location/database/:id', (req, res) => {
    const id = req.params.id;
    const body = req.body || {};
    if (body.web) {
      return res.status(400).json({
        error: {
          type: 'illegal_argument_exception',
          reason: 'web property is not supported',
        },
      });
    }
    ipLocationDatabases.set(id, {
      id: id,
      modified_date_millis: Date.now(),
      database: body,
    });
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/ip_location/database/:id?', (req, res) => {
    const id = req.params.id;
    if (id) {
      // Handle multiple IDs (comma-separated)
      const ids = id.split(',');
      const databases = ids.map((singleId) => {
        const stored = ipLocationDatabases.get(singleId.trim());
        if (stored) {
          return stored;
        }
        // Default for unknown IDs
        return {
          id: singleId.trim(),
          modified_date_millis: Date.now(),
          database: {
            name: 'GeoIP2-City',
            maxmind: { account_id: '1234' },
          },
        };
      });
      res.json({ databases });
    } else {
      res.json({ databases: Array.from(ipLocationDatabases.values()) });
    }
  });

  router.delete('/_ingest/ip_location/database/:id', (req, res) => {
    ipLocationDatabases.delete(req.params.id);
    res.json({ acknowledged: true });
  });

  router.put('/_ingest/geoip/database/:id', (req, res) => {
    globalStore.putGeoIPDatabase(req.params.id, req.body);
    res.json({ acknowledged: true });
  });

  router.get('/_ingest/geoip/database/:id?', (req, res) => {
    const id = req.params.id;
    const databases = globalStore.getGeoIPDatabase(id);
    res.json({ databases });
  });

  router.delete('/_ingest/geoip/database/:id', (req, res) => {
    globalStore.deleteGeoIPDatabase(req.params.id);
    res.json({ acknowledged: true });
  });

  router.get('/_info/ingest', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      lookup: {
        ingest: {
          processors: [
            { type: 'append' },
            { type: 'bytes' },
            { type: 'circle' },
            { type: 'community_id' },
            { type: 'convert' },
            { type: 'csv' },
            { type: 'date' },
            { type: 'date_index_name' },
            { type: 'dissect' },
            { type: 'dot_expander' },
            { type: 'drop' },
            { type: 'enrich' },
            { type: 'fail' },
            { type: 'foreach' },
            { type: 'geoip' },
            { type: 'grok' },
            { type: 'gsub' },
            { type: 'html_strip' },
            { type: 'join' },
            { type: 'json' },
            { type: 'kv' },
            { type: 'lowercase' },
            { type: 'network_direction' },
            { type: 'pipeline' },
            { type: 'remove' },
            { type: 'rename' },
            { type: 'script' },
            { type: 'set' },
            { type: 'set_security_user' },
            { type: 'sort' },
            { type: 'split' },
            { type: 'trim' },
            { type: 'uppercase' },
            { type: 'uri_parts' },
            { type: 'user_agent' },
          ],
        },
      },
    });
  });

  router.get('/_ingest/processor/grok', (req, res) => {
    res.json({
      patterns: {
        USERNAME: '[a-zA-Z0-9._-]+',
        USER: '%{USERNAME}',
        INT: '[+-]?\\d+',
      },
    });
  });

  router.post('/_ingest/pipeline/:id/_simulate', (req, res) => {
    const { docs } = req.body || {};
    const resultDocs = (docs || []).map((doc: any) => ({
      doc: {
        _index: doc._index,
        _id: doc._id,
        _source: doc._source,
        executed_pipelines: [],
      },
    }));
    res.json({ docs: resultDocs });
  });

  // Global simulate endpoint (without pipeline id)
  router.post('/_ingest/_simulate', (req, res) => {
    const { docs } = req.body || {};
    const resultDocs = (docs || []).map((doc: any) => ({
      doc: {
        _index: doc._index,
        _id: doc._id,
        _source: doc._source,
        executed_pipelines: [],
      },
    }));
    res.json({ docs: resultDocs });
  });

  return router;
}
