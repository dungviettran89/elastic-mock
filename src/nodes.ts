import { Router } from 'express';

export function createNodesRouter() {
  const router = Router();

  const nodesMock = {
    _nodes: { total: 1, successful: 1, failed: 0 },
    cluster_name: 'elastic-mock',
    nodes: {
      'mock-node-id': {
        name: 'elastic-mock',
        roles: ['master', 'data', 'ingest'],
        version: '8.10.0',
        modules: [
          {
            name: 'x-pack-ent-search',
            version: '8.10.0',
            description: 'Mock enterprise search module',
            class_name: 'org.elasticsearch.enterprise_search.EnterpriseSearch',
            has_native_controller: false,
          },
        ],
      },
    },
  };

  router.get('/', (req, res) => {
    res.json(nodesMock);
  });

  router.get('/stats', (req, res) => {
    res.json({
      _nodes: nodesMock._nodes,
      cluster_name: nodesMock.cluster_name,
      nodes: {
        'mock-node-id': {
          ...nodesMock.nodes['mock-node-id'],
          indices: { count: 0 },
          os: { timestamp: Date.now(), cpu: { percent: 0 } },
          process: { timestamp: Date.now(), open_file_descriptors: 100 },
          jvm: { timestamp: Date.now(), uptime_in_millis: 10000 },
        },
      },
    });
  });

  router.get('/usage', (req, res) => {
    res.json(nodesMock);
  });

  router.get('/hot_threads', (req, res) => {
    res.type('text/plain').send('::: Hot threads at mock-node-id :::');
  });

  router.post('/reload_secure_settings', (req, res) => {
    res.json(nodesMock);
  });

  router.get(['/:id/_repositories_metering', '/repositories_metering'], (req, res) => {
    res.json({
      _nodes: nodesMock._nodes,
      cluster_name: nodesMock.cluster_name,
      nodes: {
        'mock-node-id': {
          repositories: [],
        },
      },
    });
  });

  router.delete(
    ['/:id/_repositories_metering/:version', '/_repositories_metering/:version'],
    (req, res) => {
      res.json({
        _nodes: nodesMock._nodes,
        cluster_name: nodesMock.cluster_name,
        nodes: {
          'mock-node-id': {
            repositories: [],
          },
        },
      });
    },
  );

  router.get('/:id/repositories_metering_info', (req, res) => {
    res.json(nodesMock);
  });

  router.delete(
    [
      '/repositories_metering_archive/:max_version',
      '/:id/repositories_metering_archive/:max_version',
    ],
    (req, res) => {
      res.json(nodesMock);
    },
  );

  return router;
}
