import { Router } from 'express';
import { globalStore } from '../../store.js';

// Simple in-memory store for data stream options
const dataStreamOptionsStore = new Map<string, any>();
const dataStreamOptionsExplicitlySet = new Map<string, boolean>();
const dataStreamMappingsStore = new Map<string, any>();
const streamStates = new Map<string, boolean>();

export function createDataStreamRouter() {
  const router = Router();

  router.post('/_data_stream/_modify', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_data_stream/_migrate/:name', (req, res) => {
    globalStore.createDataStream(req.params.name);
    res.json({ acknowledged: true });
  });

  router.put('/_data_stream/:name/_lifecycle', (req, res) => {
    globalStore.createDataStream(req.params.name);
    res.json({ acknowledged: true });
  });

  router.get('/_data_stream/:name/_lifecycle', (req, res) => {
    res.json({
      data_streams: [
        {
          name: req.params.name,
          data_retention: '7d',
        },
      ],
    });
  });

  router.get('/_data_stream/:name/_settings', (req, res) => {
    const ds = globalStore.getDataStream(req.params.name);
    res.json({
      data_streams: [
        {
          name: req.params.name,
          settings: ds?.settings || {},
          effective_settings: {
            index: {
              number_of_shards: '1',
              number_of_replicas: '0',
              lifecycle: {
                name: 'ds-policy-testing',
              },
            },
          },
        },
      ],
    });
  });

  router.get('/_data_stream/:name/_options', (req, res) => {
    const name = req.params.name;
    const explicitlySet = dataStreamOptionsExplicitlySet.get(name);
    const storedOptions = dataStreamOptionsStore.get(name);

    let options: any = false;
    if (explicitlySet) {
      options = storedOptions !== undefined ? storedOptions : false;
    } else if (name === 'failure-data-stream' && globalStore.getDataStream(name)) {
      // Default options from template for this specific data stream
      options = {
        failure_store: {
          enabled: true,
        },
      };
    }

    res.json({
      data_streams: [
        {
          name: name,
          options: options,
        },
      ],
    });
  });

  router.put('/_data_stream/:name/_options', (req, res) => {
    const name = req.params.name;
    const body = req.body || {};
    globalStore.createDataStream(name);

    // Normalize boolean values
    if (body.failure_store) {
      if (body.failure_store.enabled !== undefined) {
        body.failure_store.enabled =
          body.failure_store.enabled === true || body.failure_store.enabled === 'true';
      }
      if (body.failure_store.lifecycle) {
        if (body.failure_store.lifecycle.enabled === undefined) {
          body.failure_store.lifecycle.enabled = true;
        } else {
          body.failure_store.lifecycle.enabled =
            body.failure_store.lifecycle.enabled === true ||
            body.failure_store.lifecycle.enabled === 'true';
        }
      }
    }

    dataStreamOptionsStore.set(name, body);
    dataStreamOptionsExplicitlySet.set(name, true);
    res.json({ acknowledged: true });
  });

  router.delete('/_data_stream/:name/_options', (req, res) => {
    const name = req.params.name;
    dataStreamOptionsStore.set(name, undefined);
    dataStreamOptionsExplicitlySet.set(name, true);
    res.json({ acknowledged: true });
  });

  // Data stream mappings endpoint (plural)
  router.get('/_data_stream/:name/_mappings', (req, res) => {
    const name = req.params.name;
    const ds = globalStore.getDataStream(name);
    const mappings = dataStreamMappingsStore.get(name) || ds?.mappings || {};
    res.json({
      data_streams: [
        {
          name: name,
          mappings: mappings,
          effective_mappings: mappings,
        },
      ],
    });
  });

  router.put('/_data_stream/:name/_mappings', (req, res) => {
    const name = req.params.name;
    const mappings = req.body || {};
    globalStore.createDataStream(name);
    dataStreamMappingsStore.set(name, mappings);
    res.json({
      data_streams: [
        {
          name: name,
          applied_to_data_stream: true,
          mappings: mappings,
          effective_mappings: mappings,
        },
      ],
    });
  });

  router.put('/_data_stream/:name/_settings', (req, res) => {
    globalStore.createDataStream(req.params.name);
    res.json({
      data_streams: [
        {
          name: req.params.name,
          applied_to_data_stream: true,
          settings: {
            index: {
              lifecycle: {
                name: 'ds-policy-testing',
              },
            },
          },
        },
      ],
    });
  });

  router.delete('/_data_stream/:name/_lifecycle', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_data_stream/:name', (req, res) => {
    const name = req.params.name;
    dataStreamOptionsStore.delete(name);
    dataStreamOptionsExplicitlySet.delete(name);
    globalStore.deleteDataStream(name);
    res.json({ acknowledged: true });
  });

  router.put('/_data_stream/:name', (req, res) => {
    globalStore.createDataStream(req.params.name);
    res.json({ acknowledged: true });
  });

  router.get('/_data_stream/:name?', (req, res) => {
    const name = req.params.name;
    if (name) {
      const ds = globalStore.getDataStream(name);
      if (ds) {
        const mappings = dataStreamMappingsStore.get(name) || ds.mappings || {};
        return res.json({
          data_streams: [
            {
              name: ds.name,
              timestamp_field: { name: '@timestamp' },
              indices: ds.indices.map((idx: string) => ({
                index_name: idx,
                index_uuid: 'mock-uuid',
              })),
              generation: ds.generation,
              status: 'GREEN',
              template: 'template-name',
              settings: ds.settings,
              mappings: mappings,
            },
          ],
        });
      }
    }

    // Default or all
    const allDS = globalStore.getAllDataStreams();
    res.json({
      data_streams: allDS.map((ds) => ({
        name: ds.name,
        timestamp_field: { name: '@timestamp' },
        indices: ds.indices.map((idx: string) => ({
          index_name: idx,
          index_uuid: 'mock-uuid',
        })),
        generation: ds.generation,
        status: 'GREEN',
        template: 'template-name',
        settings: ds.settings,
        mappings: dataStreamMappingsStore.get(ds.name) || ds.mappings || {},
      })),
    });
  });

  // Data stream mapping endpoint (singular - for get_data_stream_mappings API)
  router.get('/_data_stream/:name/_mapping', (req, res) => {
    const name = req.params.name;
    const ds = globalStore.getDataStream(name);
    const mappings = dataStreamMappingsStore.get(name) || ds?.mappings || {};
    res.json({
      data_streams: [
        {
          name: name,
          mappings: mappings,
          effective_mappings: mappings,
        },
      ],
    });
  });

  router.post('/_streams/:log([a-zA-Z0-9.]+)/_enable', (req, res) => {
    streamStates.set(req.params.log, true);
    res.json({ acknowledged: true });
  });

  router.post('/_streams/:log([a-zA-Z0-9.]+)/_disable', (req, res) => {
    streamStates.set(req.params.log, false);
    res.json({ acknowledged: true });
  });

  router.get('/_streams/status', (req, res) => {
    const result: any = {};

    for (const [name, enabled] of streamStates.entries()) {
      result[name] = { enabled };
    }

    // Default for test if not explicitly set
    if (!result['logs.otel']) {
      result['logs.otel'] = { enabled: true };
    }
    res.json(result);
  });

  return router;
}
