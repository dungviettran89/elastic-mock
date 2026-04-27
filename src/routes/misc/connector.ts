import { Router } from 'express';

// Simple in-memory store for connectors
const connectorsStore = new Map<string, any>();
const connectorSecretsStore = new Map<string, string>();

export function createConnectorRouter() {
  const router = Router();

  router.post('/_connector/_secret', (req, res) => {
    const id = `secret-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    connectorSecretsStore.set(id, req.body?.value ?? '');
    res.json({ id });
  });

  router.get('/_connector/_secret/:id', (req, res) => {
    const value = connectorSecretsStore.get(req.params.id);
    if (value === undefined) return res.status(404).json({ error: 'not found' });
    res.json({ value });
  });

  router.put('/_connector/_secret/:id', (req, res) => {
    connectorSecretsStore.set(req.params.id, req.body?.value ?? '');
    res.json({ result: 'updated' });
  });

  router.put('/_connector/:name', (req, res) => {
    const name = req.params.name;
    const connector = {
      id: name,
      ...req.body,
      features: {
        document_level_security: {
          enabled: false,
        },
        ...(req.body?.features || {}),
      },
      filtering: [
        {
          draft: {
            advanced_snippet: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              value: [],
            },
            rules: [],
          },
          active: {
            advanced_snippet: {
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              value: [],
            },
            rules: [],
          },
        },
      ],
    };
    connectorsStore.set(name, connector);
    res.json({ acknowledged: true, result: 'created' });
  });

  router.put('/_connector/:name/_check_in', (req, res) => {
    res.json({ result: 'updated' });
  });

  router.get('/_connector/:name?', (req, res) => {
    const name = req.params.name;
    if (name) {
      const storedConnector = connectorsStore.get(name);
      if (storedConnector) {
        res.json(storedConnector);
      } else {
        // Default connector for tests that don't create one
        res.json({
          id: name,
          index_name: 'connectors-test',
          name: 'my-connector',
          language: 'de',
          is_native: false,
          service_type: 'super-connector',
          features: {
            document_level_security: {
              enabled: true,
            },
          },
          filtering: [
            {
              draft: {
                advanced_snippet: {
                  created_at: '2023-05-25T12:30:00.000Z',
                  updated_at: '2023-05-25T12:30:00.000Z',
                  value: [
                    {
                      tables: ['some_table'],
                      query: 'SELECT id, st_geohash(coordinates) FROM my_db.some_table;',
                    },
                  ],
                },
                rules: [
                  {
                    created_at: '2023-06-25T12:30:00.000Z',
                    field: '_',
                    id: 'DEFAULT',
                    order: 0,
                    policy: 'include',
                    rule: 'regex',
                    updated_at: '2023-05-25T12:30:00.000Z',
                    value: '.*',
                  },
                ],
              },
              active: {
                advanced_snippet: {
                  created_at: '2023-05-25T12:30:00.000Z',
                  updated_at: '2023-05-25T12:30:00.000Z',
                  value: [
                    {
                      tables: ['some_table'],
                      query: 'SELECT id, st_geohash(coordinates) FROM my_db.some_table;',
                    },
                  ],
                },
                rules: [
                  {
                    created_at: '2023-06-25T12:30:00.000Z',
                    field: '_',
                    id: 'DEFAULT',
                    order: 0,
                    policy: 'include',
                    rule: 'regex',
                    updated_at: '2023-05-25T12:30:00.000Z',
                    value: '.*',
                  },
                ],
              },
            },
          ],
        });
      }
    } else {
      res.json({ count: 1, results: [{ id: 'test-connector', index_name: 'connectors-test' }] });
    }
  });

  router.post('/_connector', (req, res) => {
    res.json({ id: 'new-connector-id' });
  });

  router.delete('/_connector/:name', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_connector/_sync_job', (req, res) => {
    res.json({
      id: 'sync-job-id',
      connector: { id: req.body?.id || 'test-connector' },
      deleted_document_count: 0,
      indexed_document_count: 0,
      indexed_document_volume: 0,
    });
  });

  router.get('/_connector/_sync_job/:id', (req, res) => {
    res.json({
      id: req.params.id,
      connector: { id: 'test-connector' },
      last_seen: Date.now(),
      deleted_document_count: 10,
      indexed_document_count: 20,
      indexed_document_volume: 1000,
    });
  });

  router.put('/_connector/_sync_job/:id/_cancel', (req, res) => {
    res.json({ result: 'updated' });
  });

  router.put('/_connector/_sync_job/:id/_check_in', (req, res) => {
    res.json({ result: 'updated' });
  });

  router.get('/_connector/_sync_job', (req, res) => {
    res.json({
      count: 1,
      sync_jobs: [{ id: 'sync-job-id', connector: { id: 'test-connector' } }],
    });
  });

  router.delete('/_connector/_sync_job/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_connector/:name/_name', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.name) {
      connector.name = req.body.name;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_features', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector) {
      // Handle both { features: {...} } and direct features body
      const features = req.body?.features || req.body;
      connector.features = { ...connector.features, ...features };
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_filtering', (req, res) => {
    const name = req.params.name;
    const connector = connectorsStore.get(name);
    if (connector) {
      if (!connector.filtering || connector.filtering.length === 0) {
        connector.filtering = [
          {
            draft: { advanced_snippet: { value: [] }, rules: [] },
            active: { advanced_snippet: { value: [] }, rules: [] },
          },
        ];
      }

      const draftFiltering = connector.filtering[0];

      if (req.body?.advanced_snippet) {
        draftFiltering.draft.advanced_snippet = {
          ...draftFiltering.draft.advanced_snippet,
          ...req.body.advanced_snippet,
        };
      }
      if (req.body?.rules) {
        draftFiltering.draft.rules = req.body.rules;
      }

      connectorsStore.set(name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_filtering/_validation', (req, res) => {
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_filtering/_activate', (req, res) => {
    const name = req.params.name;
    const connector = connectorsStore.get(name);
    if (connector && connector.filtering && connector.filtering[0]) {
      // Deep copy draft to active
      connector.filtering[0].active = JSON.parse(JSON.stringify(connector.filtering[0].draft));
      connectorsStore.set(name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_active_filtering', (req, res) => {
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_error', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.error) {
      connector.error = req.body.error;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_configuration', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.configuration) {
      connector.configuration = req.body.configuration;
      connector.status = 'configured';
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_index_name', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.index_name) {
      connector.index_name = req.body.index_name;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_native', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.is_native !== undefined) {
      connector.is_native = req.body.is_native;
      connector.status = 'configured';
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_pipeline', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.pipeline) {
      connector.pipeline = req.body.pipeline;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_scheduling', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.scheduling) {
      connector.scheduling = req.body.scheduling;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_status', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.status) {
      connector.status = req.body.status;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_service_type', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.service_type) {
      connector.service_type = req.body.service_type;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/:name/_api_key_id', (req, res) => {
    const connector = connectorsStore.get(req.params.name);
    if (connector && req.body?.api_key_id) {
      connector.api_key_id = req.body.api_key_id;
      connectorsStore.set(req.params.name, connector);
    }
    res.json({ acknowledged: true, result: 'updated' });
  });

  router.put('/_connector/_sync_job/:id/_stats', (req, res) => {
    res.json({
      acknowledged: true,
      result: 'updated',
      deleted_document_count: 10,
    });
  });

  router.put('/_connector/_sync_job/:id/_check_in', (req, res) => {
    res.json({ result: 'updated' });
  });

  router.put('/_connector/_sync_job/:id/_claim', (req, res) => {
    res.json({ result: 'updated' });
  });

  router.put('/_connector/_sync_job/:id/_error', (req, res) => {
    res.status(400).json({
      error: {
        type: 'bad_request',
        reason: 'Invalid request',
      },
    });
  });

  router.post('/_connector/_sync_job/:id/_error', (req, res) => {
    res.status(400).json({
      error: {
        type: 'bad_request',
        reason: 'Invalid request',
      },
    });
  });

  return router;
}
