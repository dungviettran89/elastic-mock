import { Router } from 'express';
import { globalStore } from '../../store.js';
import { logger } from '../../logger.js';

export const bulkRouter = Router();

// Reindex API
bulkRouter.post('/_reindex', (req, res) => {
  if (req.query.wait_for_completion === 'false' || req.body?.wait_for_completion === false) {
    return res.json({
      task: 'mock-task-id:123',
    });
  }
  res.json({
    took: 1,
    timed_out: false,
    total: 1,
    updated: 0,
    created: 1,
    deleted: 0,
    batches: 1,
    version_conflicts: 0,
    noops: 0,
    retries: { bulk: 0, search: 0 },
    throttled_millis: 0,
    requests_per_second: -1,
    throttled_until_millis: 0,
    failures: [],
  });
});

// Bulk API
const handleBulk = (req: any, res: any) => {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = body
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => JSON.parse(line));
    } catch (e: any) {
      logger.error(`Documents: Bulk parsing failed: ${e.message}`);
      return res.status(400).json({ error: 'Invalid NDJSON' });
    }
  }
  logger.info(`Documents: Processing bulk request (${body.length} lines)`);
  const result = globalStore.bulk(body);
  res.status(200).json(result);
};

bulkRouter.post('/_bulk', handleBulk);
bulkRouter.post('/:index/_bulk', handleBulk);
