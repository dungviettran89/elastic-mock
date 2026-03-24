import { Router } from 'express';

// In-memory store for snapshot repositories and snapshots
const repositories = new Map<string, any>();
const snapshots = new Map<string, any>();

export function createSnapshotRouter() {
  const router = Router();

  // Create repository
  router.put(['/_snapshot/:repository', '/_snapshot/:repository/'], (req, res) => {
    const { repository } = req.params;
    repositories.set(repository, req.body);
    res.json({ acknowledged: true });
  });

  // Get repository
  router.get(['/_snapshot', '/_snapshot/:repository'], (req, res) => {
    const { repository } = req.params;
    if (repository) {
      const repo = repositories.get(repository);
      if (repo) {
        res.json({ [repository]: repo });
      } else {
        res.status(404).json({
          error: {
            root_cause: [
              { type: 'repository_missing_exception', reason: `[${repository}] missing` },
            ],
            type: 'repository_missing_exception',
            reason: `[${repository}] missing`,
          },
          status: 404,
        });
      }
    } else {
      res.json(Object.fromEntries(repositories.entries()));
    }
  });

  // Delete repository
  router.delete('/_snapshot/:repository', (req, res) => {
    repositories.delete(req.params.repository);
    res.json({ acknowledged: true });
  });

  // Create snapshot
  router.put('/_snapshot/:repository/:snapshot', (req, res) => {
    const { repository, snapshot } = req.params;
    const key = `${repository}:${snapshot}`;
    const snap = {
      snapshot: snapshot,
      uuid: `mock-uuid-${snapshot}`,
      version_id: 8000000,
      version: '8.0.0',
      indices: req.body.indices || ['*'],
      data_streams: [],
      include_global_state: true,
      state: 'SUCCESS',
      start_time: new Date().toISOString(),
      start_time_in_millis: Date.now(),
      end_time: new Date().toISOString(),
      end_time_in_millis: Date.now() + 100,
      duration_in_millis: 100,
      failures: [],
      shards: { total: 1, failed: 0, successful: 1 },
    };
    snapshots.set(key, snap);
    res.json({ accepted: true, snapshot: snap });
  });

  // Get snapshot
  router.get('/_snapshot/:repository/:snapshot', (req, res) => {
    const { repository, snapshot } = req.params;
    if (snapshot === '_all') {
      const result = Array.from(snapshots.entries())
        .filter(([key]) => key.startsWith(`${repository}:`))
        .map(([_, s]) => s);
      return res.json({ snapshots: result });
    }
    const key = `${repository}:${snapshot}`;
    const snap = snapshots.get(key);
    if (snap) {
      res.json({ snapshots: [snap] });
    } else {
      res.json({
        snapshots: [
          {
            snapshot: snapshot,
            state: 'SUCCESS',
            indices: ['*'],
            shards: { total: 1, failed: 0, successful: 1 },
            failures: [],
          },
        ],
      });
    }
  });

  // Delete snapshot
  router.delete('/_snapshot/:repository/:snapshot', (req, res) => {
    const { repository, snapshot } = req.params;
    snapshots.delete(`${repository}:${snapshot}`);
    res.json({ acknowledged: true });
  });

  // Snapshot status
  router.get('/_snapshot/:repository/:snapshot/_status', (req, res) => {
    const { repository, snapshot } = req.params;
    const key = `${repository}:${snapshot}`;
    const snap = snapshots.get(key) || { snapshot: snapshot, state: 'SUCCESS' };
    res.json({
      snapshots: [
        {
          ...snap,
          repository,
          shards_stats: { initializing: 0, started: 1, finalizing: 0, done: 0 },
          stats: {
            incremental: { file_count: 0, size_in_bytes: 0 },
            total: { file_count: 1, size_in_bytes: 100 },
          },
        },
      ],
    });
  });

  // Snapshot restore
  router.post('/_snapshot/:repository/:snapshot/_restore', (req, res) => {
    res.json({ accepted: true });
  });

  // Snapshot clone
  router.post('/_snapshot/:repository/:snapshot/_clone/:target', (req, res) => {
    const { repository, target } = req.params;
    const snap = { snapshot: target, state: 'SUCCESS', indices: ['*'] };
    snapshots.set(`${repository}:${target}`, snap);
    res.json({ acknowledged: true });
  });

  router.put('/_snapshot/:repository/:snapshot/_clone/:target', (req, res) => {
    const { repository, target } = req.params;
    const snap = { snapshot: target, state: 'SUCCESS', indices: ['*'] };
    snapshots.set(`${repository}:${target}`, snap);
    res.json({ acknowledged: true });
  });

  // Cleanup repository
  router.post('/_snapshot/:repository/_cleanup', (req, res) => {
    res.json({ results: { deleted_bytes: 0, deleted_blobs: 0 } });
  });

  // Verify repository
  router.post('/_snapshot/:repository/_verify', (req, res) => {
    res.json({ nodes: { 'node-1': { name: 'node-1' } } });
  });

  // Analyze repository
  router.post('/_snapshot/:repository/_analyze', (req, res) => {
    res.json({ repository: req.params.repository });
  });

  // Searchable Snapshots Mount
  router.post('/_snapshot/:repository/:snapshot/_mount', (req, res) => {
    const { repository, snapshot } = req.params;
    res.json({
      snapshot: {
        snapshot,
        indices: [req.body.index || 'test-index'],
        shards: { total: 1, failed: 0, successful: 1 },
      },
    });
  });

  // Searchable Snapshots Stats
  router.get('/_searchable_snapshots/stats', (req, res) => {
    res.json({
      total_directories_count: 1,
      directories_count: 1,
      _shards: { total: 1, successful: 1, failed: 0 },
    });
  });

  // Searchable Snapshots Cache Stats
  router.get('/_searchable_snapshots/cache/stats', (req, res) => {
    res.json({
      nodes: {
        'mock-node-id': {
          shared_cache: {
            reads: 0,
            bytes_read: 0,
            writes: 0,
            bytes_written: 0,
            evictions: 0,
            num_regions: 100,
            size_in_bytes: 1024 * 1024 * 1024,
            region_size_in_bytes: 1024 * 1024,
          },
        },
      },
    });
  });

  // Searchable Snapshots Clear Cache
  router.post(
    ['/_searchable_snapshots/cache/clear', '/:index/_searchable_snapshots/cache/clear'],
    (req, res) => {
      res.json({
        _shards: { total: 1, successful: 1, failed: 0 },
      });
    },
  );

  return router;
}
