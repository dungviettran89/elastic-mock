import { Router } from 'express';

export function createMiscCoreRouter() {
  const router = Router();

  // Reindex rethrottle
  router.post(['/_reindex/:id/_rethrottle', '/_delete_by_query/:id/_rethrottle'], (req, res) => {
    const { id } = req.params;
    const [nodeId] = id.split(':');

    if (nodeId === 'test') {
      return res.json({
        nodes: {},
        node_failures: [
          {
            node_id: 'test',
            caused_by: {
              type: 'no_such_node_exception',
              reason: 'no such node [test]',
            },
          },
        ],
      });
    }

    res.json({
      nodes: {
        [nodeId || 'node-1']: {
          name: nodeId || 'node-1',
          tasks: {
            [id]: {
              status: 'running',
              description: 'reindex',
            },
          },
        },
      },
    });
  });

  // Explain API
  router.post('/:index/_explain/:id', (req, res) => {
    const { index, id } = req.params;
    const body = req.body || {};
    const query = body.query || {};

    res.json({
      _index: index,
      _id: id,
      matched: true,
      explanation: {
        value: 1.0,
        description: 'weight',
        details: [{ value: 1.0, description: 'Query', details: [] }],
      },
    });
  });

  // Field Caps API
  router.post(['/_field_caps', '/:index/_field_caps'], (req, res) => {
    const { index } = req.params;
    const body = req.body || {};
    let fields = body.fields || [];

    if (typeof fields === 'string') {
      fields = [fields];
    }

    const result: any = { indices: index ? [index] : [], fields: {} };

    for (const field of fields) {
      result.fields[field] = {
        text: {
          type: 'text',
          searchable: true,
          aggregatable: false,
          indices: index ? [index] : ['mock-index'],
          metadata_field: false,
        },
      };
    }

    if (fields.length === 0) {
      result.fields = {
        text: {
          text: {
            type: 'text',
            searchable: true,
            aggregatable: false,
            indices: index ? [index] : ['mock-index'],
            metadata_field: false,
          },
        },
      };
    }

    res.json(result);
  });

  // Vector Tiles
  router.all(['/:index/_mvt/:field/:zoom/:x/:y', '/_mvt/:field/:zoom/:x/:y'], (req, res) => {
    res.status(200).send(Buffer.alloc(0));
  });

  // Features API
  router.get('/_features', (req, res) => {
    res.json({
      features: [
        {
          name: 'tasks',
          description: 'Tasks management',
        },
      ],
    });
  });

  router.post('/_features/_reset', (req, res) => {
    res.json({
      features: [
        {
          name: 'tasks',
          status: 'SUCCESS',
        },
      ],
    });
  });

  // Health Report API
  router.get(['/_health_report', '/_health_report/:feature'], (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      status: 'green',
      indicators: {
        master_is_stable: {
          status: 'green',
          symptom: 'The cluster has a stable master node',
          details: {
            current_master: {
              node_id: 'mock-node-id',
              name: 'elastic-mock',
            },
          },
        },
      },
    });
  });

  return router;
}
