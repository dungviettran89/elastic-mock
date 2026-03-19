import express from 'express';
import { createClusterRouter } from './cluster.js';
import { createIndicesRouter } from './routes/indices/index.js';
import { createDocumentRouter } from './routes/document/index.js';
import { createSearchRouter } from './search.js';
import { createCatRouter } from './routes/cat/index.js';
import { createNodesRouter, createTasksRouter } from './nodes.js';
import { createMiscRouter } from './routes/misc.js';
import { logger } from './logger.js';

export function createServer() {
  const app = express();

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        `${req.method} ${req.originalUrl} (path: ${req.path}) ${res.statusCode} ${duration}ms`,
        {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          contentType: req.get('content-type'),
        },
      );
    });
    next();
  });

  app.use(
    express.json({
      type: ['application/json', 'application/vnd.elasticsearch+json'],
    }),
  );
  app.use(
    express.text({
      type: ['application/x-ndjson', 'application/vnd.elasticsearch+x-ndjson'],
      limit: '50mb',
    }),
  );

  // Add mandatory ES header
  app.use((req, res, next) => {
    res.setHeader('X-Elastic-Product', 'Elasticsearch');
    next();
  });

  // Basic ES info endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'serverless',
      cluster_name: 'elastic-mock',
      cluster_uuid: 'z1234567890',
      version: {
        number: '8.13.0',
        build_flavor: 'default',
        build_type: 'docker',
        build_hash: 'mock',
        build_date: new Date().toISOString(),
        build_snapshot: false,
        lucene_version: '9.10.0',
        minimum_wire_compatibility_version: '7.17.0',
        minimum_index_compatibility_version: '7.0.0',
      },
      tagline: 'You Know, for Search',
    });
  });

  // Order matters: more specific routes first if there is overlap

  // CAT APIs
  app.use('/_cat', createCatRouter());

  // Misc Mocks (Watcher, Scripts, SQL, etc.)
  app.use('/', createMiscRouter());

  // Cluster APIs
  app.use('/_cluster', createClusterRouter());

  // Shortcuts for common root-level APIs
  app.get('/_health', (req, res) => res.redirect('/_cluster/health'));
  app.get('/health', (req, res) => res.redirect('/_cluster/health'));

  // Nodes and Tasks Routers
  app.use('/_nodes', createNodesRouter());
  app.use('/_tasks', createTasksRouter());

  // Search APIs (Global /_search and /:index/_search)
  app.use('/', createSearchRouter());

  // Document APIs (includes /_bulk)
  app.use('/', createDocumentRouter());

  // Indices APIs (at root level like /products)
  app.use('/', createIndicesRouter());

  return app;
}
