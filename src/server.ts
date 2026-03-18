import express from 'express';
import { createClusterRouter } from './cluster.js';
import { createIndicesRouter } from './indices.js';
import { createDocumentRouter } from './document.js';
import { createSearchRouter } from './search.js';
import { createCatRouter } from './cat.js';
import { logger } from './logger.js';

export function createServer() {
  const app = express();

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        contentType: req.get('content-type'),
      });
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
      name: 'elastic-mock',
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

  // Order matters: more specific routes first if there is overlap,
  // but here they are mostly prefix-based.

  // Cluster APIs
  app.use('/_cluster', createClusterRouter());

  // CAT APIs
  app.use('/_cat', createCatRouter());

  // Document APIs (includes /_bulk)
  app.use('/', createDocumentRouter());

  // Search APIs (Global /_search and /:index/_search)
  app.use('/', createSearchRouter());

  // Indices APIs (at root level like /products)
  app.use('/', createIndicesRouter());

  return app;
}
