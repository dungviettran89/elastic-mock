import { Router } from 'express';

// Simple in-memory store for data stream options
const dataStreamOptionsStore = new Map<string, any>();
const dataStreamOptionsExplicitlySet = new Map<string, boolean>();

export function createDataStreamRouter() {
  const router = Router();

  router.post('/_data_stream/_modify', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_data_stream/_migrate/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_data_stream/:name/_lifecycle', (req, res) => {
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
    res.json({
      data_streams: [
        {
          name: req.params.name,
          settings: {},
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
    const storedOptions = dataStreamOptionsStore.get(name);
    const explicitlySet = dataStreamOptionsExplicitlySet.get(name);

    let options: any = false;
    if (explicitlySet && storedOptions !== undefined) {
      options = storedOptions;
    } else if (!explicitlySet && name === 'failure-data-stream') {
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
    
    // Add default values for lifecycle.enabled if not present
    if (body.failure_store && body.failure_store.lifecycle) {
      if (body.failure_store.lifecycle.enabled === undefined) {
        body.failure_store.lifecycle.enabled = true;
      }
    }
    
    dataStreamOptionsStore.set(name, body);
    dataStreamOptionsExplicitlySet.set(name, true);
    res.json({ acknowledged: true });
  });

  router.delete('/_data_stream/:name/_options', (req, res) => {
    const name = req.params.name;
    dataStreamOptionsStore.delete(name);
    dataStreamOptionsExplicitlySet.delete(name);
    res.json({ acknowledged: true });
  });

  // Data stream mappings endpoint (plural)
  router.get('/_data_stream/:name/_mappings', (req, res) => {
    res.json({
      data_streams: [
        {
          name: req.params.name,
          mappings: {},
          effective_mappings: {},
        },
      ],
    });
  });

  router.put('/_data_stream/:name/_mappings', (req, res) => {
    res.json({
      data_streams: [
        {
          name: req.params.name,
          applied_to_data_stream: true,
          mappings: req.body || {},
          effective_mappings: req.body || {},
        },
      ],
    });
  });

  router.put('/_data_stream/:name/_settings', (req, res) => {
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
    res.json({ acknowledged: true });
  });

  router.put('/_data_stream/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_data_stream/:name?', (req, res) => {
    const name = req.params.name || 'logs-test';
    res.json({
      data_streams: [
        {
          name: name,
          timestamp_field: { name: '@timestamp' },
          indices: [
            {
              index_name: `.ds-${name}-000001`,
              index_uuid: 'mock-uuid',
            },
          ],
          generation: 1,
          status: 'GREEN',
          template: 'template-name',
          settings: {},
        },
      ],
    });
  });

  // Data stream mapping endpoint (singular - for get_data_stream_mappings API)
  router.get('/_data_stream/:name/_mapping', (req, res) => {
    res.json({
      data_streams: [
        {
          name: req.params.name,
          mappings: {},
          effective_mappings: {},
        },
      ],
    });
  });

  router.post('/_streams/:log/_enable', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_streams/:log/_disable', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_streams/status', (req, res) => {
    res.json({ 'logs.otel': { enabled: true } });
  });

  return router;
}
