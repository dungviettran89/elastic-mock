import express from 'express';
import { createClusterRouter } from './cluster.js';
import { createIndicesRouter } from './routes/indices/index.js';
import { createDocumentRouter } from './routes/document/index.js';
import { searchRouter } from './routes/document/search.js';
import { createCatRouter } from './routes/cat/index.js';
import { createMiscRouter } from './routes/misc/index.js';
import { logger } from './logger.js';
import { globalStore } from './store.js';

export function createServer() {
  const app = express();

  // Basic Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Elastic-Product', 'Elasticsearch');
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

  // Handle NDJSON before JSON to avoid parser errors on multi-line JSON
  // Also handle cases where application/json is used but it's actually NDJSON (common in some tests)
  app.use((req, res, next) => {
    const contentType = req.get('content-type') || '';
    if (
      contentType.includes('ndjson') ||
      req.path.includes('_bulk') ||
      req.path.includes('_msearch') ||
      req.path.includes('find_structure') ||
      req.path.includes('find_message_structure') ||
      req.path.includes('find_field_structure')
    ) {
      express.text({ type: '*/*', limit: '50mb' })(req, res, (err) => {
        if (err) return next(err);
        if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
          try {
            // If it looks like a single JSON, try to parse it
            if (!req.body.includes('\n') || req.body.trim().split('\n').length === 1) {
              req.body = JSON.parse(req.body);
            }
          } catch (e) {}
        }
        next();
      });
    } else {
      express.json({
        type: ['application/json', 'application/vnd.elasticsearch+json'],
      })(req, res, (err?: any) => {
        if (err instanceof SyntaxError) {
          logger.info(
            `Body Parser: SyntaxError in JSON body for ${req.path}, falling back to text parsing`,
          );
          // If JSON parsing fails, fallback to text parsing
          express.text({ type: '*/*', limit: '50mb' })(req, res, (textErr?: any) => {
            if (textErr) return next(textErr);
            next();
          });
        } else {
          next(err);
        }
      });
    }
  });

  // Simple auth check for disabled users and passwords
  app.use((req, res, next) => {
    const auth = req.get('authorization');
    if (auth && auth.startsWith('Basic ')) {
      const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
      const username = credentials[0];
      const password = credentials[1];

      const user = globalStore.getUser(username);

      // If user exists in store, check password and enabled status
      if (user) {
        if (globalStore.isUserDisabled(username)) {
          logger.info(`Auth: Blocking disabled user ${username}`);
          return res.status(401).json({
            error: {
              root_cause: [
                {
                  type: 'unauthorized',
                  reason: `unable to authenticate user [${username}] for REST request [${req.path}]`,
                  header: { 'WWW-Authenticate': 'Basic realm="security" charset="UTF-8"' },
                },
              ],
              type: 'unauthorized',
              reason: `unable to authenticate user [${username}] for REST request [${req.path}]`,
              header: { 'WWW-Authenticate': 'Basic realm="security" charset="UTF-8"' },
            },
            status: 401,
          });
        }

        if (user.password && user.password !== password) {
          logger.info(`Auth: Password mismatch for user ${username}`);
          return res.status(401).json({
            error: {
              root_cause: [
                {
                  type: 'unauthorized',
                  reason: `unable to authenticate user [${username}] for REST request [${req.path}]`,
                  header: { 'WWW-Authenticate': 'Basic realm="security" charset="UTF-8"' },
                },
              ],
              type: 'unauthorized',
              reason: `unable to authenticate user [${username}] for REST request [${req.path}]`,
              header: { 'WWW-Authenticate': 'Basic realm="security" charset="UTF-8"' },
            },
            status: 401,
          });
        }
      } else {
        // Hardcoded check for 'juan' if not in store (for compatibility with previous mock state if any)
        if (username === 'juan' && globalStore.isUserDisabled('juan')) {
          logger.info(`Auth: Blocking hardcoded disabled user juan`);
          return res.status(401).json({
            error: {
              root_cause: [
                {
                  type: 'unauthorized',
                  reason: `unable to authenticate user [juan] for REST request [${req.path}]`,
                  header: { 'WWW-Authenticate': 'Basic realm="security" charset="UTF-8"' },
                },
              ],
              type: 'unauthorized',
              reason: `unable to authenticate user [juan] for REST request [${req.path}]`,
              header: { 'WWW-Authenticate': 'Basic realm="security" charset="UTF-8"' },
            },
            status: 401,
          });
        }
      }
    }
    next();
  });

  // Home/Info
  app.get('/', (req, res) => {
    res.json({
      name: 'serverless',
      cluster_name: 'elastic-mock',
      cluster_uuid: 'mock-uuid',
      version: {
        number: '8.10.0',
        build_flavor: 'default',
        build_type: 'docker',
        build_hash: 'mock-hash',
        build_date: new Date().toISOString(),
        build_snapshot: false,
        lucene_version: '9.7.0',
        minimum_wire_compatibility_version: '7.17.0',
        minimum_index_compatibility_version: '7.0.0',
      },
      tagline: 'You Know, for Search',
    });
  });

  // Cluster APIs
  app.use('/', createClusterRouter());

  // CAT APIs
  app.use('/_cat', createCatRouter());

  // Misc Mocks (Watcher, Scripts, SQL, etc.)
  app.use('/', createMiscRouter());

  // Search APIs (/_search, /index/_search)
  app.use('/', searchRouter);

  // Document APIs (includes /_bulk)
  app.use('/', createDocumentRouter());

  // Indices APIs (at root level like /products)
  app.use('/', createIndicesRouter());

  return app;
}
