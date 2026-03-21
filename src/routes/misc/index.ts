import { Router } from 'express';
import { createWatcherRouter } from './watcher.js';
import { createScriptsRouter } from './scripts.js';
import { createSqlRouter } from './sql.js';
import { createClusterRouter } from './cluster.js';
import { createEnrichRouter } from './enrich.js';
import { createIngestRouter } from './ingest.js';
import { createTransformRouter } from './transform.js';
import { createSynonymsRouter } from './synonyms.js';
import { createSecurityRouter } from './security.js';
import { createMlRouter } from './ml.js';
import { createConnectorRouter } from './connector.js';
import { createMigrationRouter } from './migration.js';
import { createQueryRulesRouter } from './query_rules.js';
import { createSearchApplicationRouter } from './search_application.js';
import { createInferenceRouter } from './inference.js';
import { createEsqlRouter } from './esql.js';
import { createDataStreamRouter } from './data_stream.js';
import { createEqlRouter } from './eql.js';
import { createTextStructureRouter } from './text_structure.js';
import { createAsyncSearchRouter } from './async_search.js';
import { createLogstashRouter } from './logstash.js';
import { createPitRouter } from './pit.js';
import { createIlmRouter } from './ilm.js';
import { createLicenseRouter } from './license.js';
import { createMiscCoreRouter } from './misc_core.js';

export function createMiscRouter() {
  const router = Router();

  // Use all sub-routers - order matters! License before MiscCore to avoid conflicts
  router.use(createLicenseRouter());
  router.use(createWatcherRouter());
  router.use(createScriptsRouter());
  router.use(createSqlRouter());
  router.use(createClusterRouter());
  router.use(createEnrichRouter());
  router.use(createIngestRouter());
  router.use(createTransformRouter());
  router.use(createSynonymsRouter());
  router.use(createSecurityRouter());
  router.use(createMlRouter());
  router.use(createConnectorRouter());
  router.use(createMigrationRouter());
  router.use(createQueryRulesRouter());
  router.use(createSearchApplicationRouter());
  router.use(createInferenceRouter());
  router.use(createEsqlRouter());
  router.use(createDataStreamRouter());
  router.use(createEqlRouter());
  router.use(createTextStructureRouter());
  router.use(createAsyncSearchRouter());
  router.use(createLogstashRouter());
  router.use(createPitRouter());
  router.use(createIlmRouter());
  router.use(createMiscCoreRouter());

  return router;
}
