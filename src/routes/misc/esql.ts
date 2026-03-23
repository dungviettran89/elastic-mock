import { Router } from 'express';

// In-memory store for async query results
const asyncQueryStore = new Map<string, any>();

// In-memory store for ESQL views
const viewsStore = new Map<string, { name: string; query: string }>();

// Helper function to extract index name from FROM clause
function extractIndexName(query: string): string | null {
  const fromMatch = query.match(/FROM\s+([a-zA-Z0-9_-]+)/i);
  return fromMatch ? fromMatch[1] : null;
}

// Helper function to extract columns from index mappings (mock)
function getColumnsForIndex(indexName: string): Array<{ name: string; type: string }> {
  // Return default columns for any index
  return [
    { name: '@timestamp', type: 'date' },
    { name: 'client.ip', type: 'ip' },
    { name: 'event.duration', type: 'long' },
    { name: 'message', type: 'keyword' },
  ];
}

// Helper function to extract EVAL computed columns
function extractEvalColumns(query: string): Array<{ name: string; type: string }> {
  const evalColumns: Array<{ name: string; type: string }> = [];

  // Match EVAL ... = ... patterns and extract the alias name
  const evalRegex = /EVAL\s+([a-zA-Z0-9_]+)\s*=/gi;
  let match;
  while ((match = evalRegex.exec(query)) !== null) {
    const columnName = match[1];
    // Determine type based on the function used
    if (query.includes('ROUND(') || query.includes('ROUND (')) {
      evalColumns.push({ name: columnName, type: 'double' });
    } else {
      evalColumns.push({ name: columnName, type: 'double' });
    }
  }

  return evalColumns;
}

export function createEsqlRouter() {
  const router = Router();

  // ES|QL query endpoint (POST /_query) - main endpoint used by Elasticsearch client
  router.post('/_query', (req, res) => {
    const { query } = req.body || {};

    // Parse the query to extract index name and columns
    const indexName = query ? extractIndexName(query) : null;
    let columns = indexName ? getColumnsForIndex(indexName) : getColumnsForIndex('default');

    // Check if query has EVAL clause to add computed columns
    if (query && query.includes('EVAL')) {
      const evalColumns = extractEvalColumns(query);
      columns.push(...evalColumns);
    }

    res.json({
      columns,
      values: [],
    });
  });

  // ES|QL async query endpoint (POST /_query/async) - main endpoint used by Elasticsearch client
  router.post('/_query/async', (req, res) => {
    const { query } = req.body || {};

    // Parse the query to extract index name and columns
    const indexName = query ? extractIndexName(query) : null;
    let columns = indexName ? getColumnsForIndex(indexName) : getColumnsForIndex('default');

    if (query && query.includes('EVAL')) {
      const evalColumns = extractEvalColumns(query);
      columns.push(...evalColumns);
    }

    const id = 'mock-esql-async-id-' + Date.now();
    const result = {
      id: id,
      is_running: false,
      is_partial: false,
      start_time_in_millis: Date.now(),
      expiration_time_in_millis: Date.now() + 10000,
      columns,
      values: [],
    };

    // Store for GET endpoint
    asyncQueryStore.set(id, result);

    res.json(result);
  });

  // ES|QL async query get endpoint (GET /_query/async/:id)
  router.get('/_query/async/:id', (req, res) => {
    const stored = asyncQueryStore.get(req.params.id);
    if (stored) {
      res.json(stored);
    } else {
      // Default response for unknown IDs
      const columns = [
        { name: '@timestamp', type: 'date' },
        { name: 'client.ip', type: 'ip' },
        { name: 'event.duration', type: 'long' },
        { name: 'message', type: 'keyword' },
      ];
      res.json({
        id: req.params.id,
        is_running: false,
        is_partial: false,
        start_time_in_millis: Date.now(),
        expiration_time_in_millis: Date.now() + 10000,
        columns,
        values: [],
      });
    }
  });

  // ES|QL async query stop endpoint (POST /_query/async/:id/_stop or /stop)
  router.post(['/_query/async/:id/_stop', '/_query/async/:id/stop'], (req, res) => {
    res.json({
      id: req.params.id,
      is_running: false,
      is_partial: false,
    });
  });

  // ES|QL async query delete endpoint (DELETE /_query/async/:id)
  router.delete('/_query/async/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // ES|QL query list and get
  router.get('/_query/esql', (req, res) => {
    res.json({ queries: {} });
  });

  // ES|QL views endpoints (alternative paths)
  router.put(['/_query/esql/view/:name', '/_esql/view/:name'], (req, res) => {
    const { name } = req.params;
    const { query } = req.body || {};
    viewsStore.set(name, { name, query: query || '' });
    res.json({
      acknowledged: true,
      result: 'created',
      views: [viewsStore.get(name)],
    });
  });

  router.get(['/_query/esql/view/:name', '/_esql/view/:name'], (req, res) => {
    const { name } = req.params;
    const view = viewsStore.get(name);
    if (view) {
      res.json({
        views: [view],
      });
    } else {
      res.status(404).json({
        error: {
          type: 'resource_not_found_exception',
          reason: `View [${name}] not found`,
        },
      });
    }
  });

  router.get(['/_query/esql/view', '/_esql/view'], (req, res) => {
    res.json({ views: Array.from(viewsStore.values()) });
  });

  router.delete(['/_query/esql/view/:name', '/_esql/view/:name'], (req, res) => {
    const { name } = req.params;
    viewsStore.delete(name);
    res.json({ acknowledged: true });
  });

  router.get('/_query/esql/:id', (req, res) => {
    res.status(400).json({
      error: {
        type: 'illegal_argument_exception',
        reason: 'Query not found',
      },
    });
  });

  // Legacy /_esql paths (keep for backward compatibility)

  // Legacy /_esql paths (keep for backward compatibility)
  router.get('/_esql/queries', (req, res) => {
    res.json({ queries: [] });
  });

  return router;
}
