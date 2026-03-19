import { Router } from 'express';
import { globalStore } from './store.js';

export function createCatRouter() {
  const router = Router();

  const formatResults = (res: any, req: any, data: any[], headers: string[]) => {
    const isJson = req.query.format === 'json';
    if (isJson) {
      return res.json(data);
    }

    const isVerbose = req.query.v !== undefined;
    let output = '';

    if (isVerbose) {
      output += headers.join('\t') + '\n';
    }

    data.forEach((row) => {
      output += headers.map((h) => row[h]).join('\t') + '\n';
    });

    res.type('text/plain').send(output);
  };

  router.get('/health', (req, res) => {
    const data = [
      {
        epoch: Math.floor(Date.now() / 1000),
        timestamp: new Date().toLocaleTimeString(),
        cluster: 'elastic-mock',
        status: 'green',
        'node.total': 1,
        'node.data': 1,
        shards: 0,
        pri: 0,
        relo: 0,
        init: 0,
        unassign: 0,
        pending_tasks: 0,
        max_task_wait_time: '-',
        active_shards_percent: '100.0%',
      },
    ];
    formatResults(res, req, data, [
      'epoch',
      'timestamp',
      'cluster',
      'status',
      'node.total',
      'node.data',
      'shards',
      'pri',
      'relo',
      'init',
      'unassign',
      'pending_tasks',
      'max_task_wait_time',
      'active_shards_percent',
    ]);
  });

  router.get('/indices/:index?', (req, res) => {
    const { index } = req.params;
    const indices = index
      ? [globalStore.getIndex(index)].filter(Boolean)
      : globalStore.getAllIndices();

    const data = (indices as any[]).map((idx) => ({
      health: 'green',
      status: 'open',
      index: idx.name,
      uuid: 'mock-uuid',
      pri: 1,
      rep: 0,
      'docs.count': idx.documents.size,
      'docs.deleted': 0,
      'store.size': '1kb',
      'pri.store.size': '1kb',
    }));

    formatResults(res, req, data, [
      'health',
      'status',
      'index',
      'uuid',
      'pri',
      'rep',
      'docs.count',
      'docs.deleted',
      'store.size',
      'pri.store.size',
    ]);
  });

  router.get('/nodes', (req, res) => {
    const data = [
      {
        id: 'mock-node-id',
        ip: '127.0.0.1',
        name: 'elastic-mock',
        'heap.percent': 10,
        'ram.percent': 20,
        cpu: 5,
        load_1m: '0.05',
        node_role: 'dim',
        master: '*',
        name_full: 'elastic-mock',
      },
    ];
    formatResults(res, req, data, [
      'ip',
      'heap.percent',
      'ram.percent',
      'cpu',
      'load_1m',
      'node_role',
      'master',
      'name',
    ]);
  });

  router.get('/count/:index?', (req, res) => {
    const { index } = req.params;
    const count = index
      ? globalStore.getDocCount(index)
      : globalStore.getAllIndices().reduce((acc, idx) => acc + idx.documents.size, 0);

    const data = [
      {
        epoch: Math.floor(Date.now() / 1000),
        timestamp: new Date().toLocaleTimeString(),
        count: count,
      },
    ];

    formatResults(res, req, data, ['epoch', 'timestamp', 'count']);
  });

  router.get('/aliases/:alias?', (req, res) => {
    const { alias } = req.params;
    const data: any[] = [];

    for (const index of globalStore.getAllIndices()) {
      for (const a of index.aliases) {
        if (!alias || a === alias) {
          data.push({
            alias: a,
            index: index.name,
            filter: '-',
            routing_index: '-',
            routing_search: '-',
            is_write_index: '-',
          });
        }
      }
    }

    formatResults(res, req, data, [
      'alias',
      'index',
      'filter',
      'routing_index',
      'routing_search',
      'is_write_index',
    ]);
  });

  router.get('/shards/:index?', (req, res) => {
    const { index } = req.params;
    const indices = index
      ? [globalStore.getIndex(index)].filter(Boolean)
      : globalStore.getAllIndices();

    const data: any[] = [];
    indices.forEach((idx) => {
      if (idx) {
        data.push({
          index: idx.name,
          shard: '0',
          prirep: 'p',
          state: 'STARTED',
          docs: idx.documents.size,
          store: '1kb',
          ip: '127.0.0.1',
          node: 'elastic-mock',
        });
      }
    });

    formatResults(res, req, data, [
      'index',
      'shard',
      'prirep',
      'state',
      'docs',
      'store',
      'ip',
      'node',
    ]);
  });

  router.get('/segments/:index?', (req, res) => {
    formatResults(res, req, [], ['index', 'shard', 'prirep', 'segment', 'generation', 'docs.count', 'docs.deleted', 'size', 'size.memory', 'committed', 'searchable', 'version', 'compound']);
  });

  router.get('/recovery/:index?', (req, res) => {
    formatResults(res, req, [], ['index', 'shard', 'time', 'type', 'stage', 'source_host', 'source_node', 'target_host', 'target_node', 'repository', 'snapshot', 'files', 'files_recovered', 'files_percent', 'bytes', 'bytes_recovered', 'bytes_percent', 'translog_ops', 'translog_ops_recovered', 'translog_ops_percent']);
  });

  router.get('/pending_tasks', (req, res) => {
    formatResults(res, req, [], ['insertOrder', 'timeInQueue', 'priority', 'source']);
  });

  router.get('/tasks', (req, res) => {
    formatResults(res, req, [], ['action', 'task_id', 'parent_task_id', 'type', 'start_time', 'timestamp', 'running_time', 'ip', 'node']);
  });

  router.get('/allocation/:node?', (req, res) => {
    const indicesCount = globalStore.getAllIndices().length;
    const data = [
      {
        shards: indicesCount,
        'disk.indices': '1kb',
        'disk.used': '100mb',
        'disk.avail': '50gb',
        'disk.total': '100gb',
        'disk.percent': 1,
        host: '127.0.0.1',
        ip: '127.0.0.1',
        node: 'elastic-mock',
      },
    ];

    formatResults(res, req, data, [
      'shards',
      'disk.indices',
      'disk.used',
      'disk.avail',
      'disk.total',
      'disk.percent',
      'host',
      'ip',
      'node',
    ]);
  });

  router.get('/templates/:name?', (req, res) => {
    formatResults(res, req, [], ['name', 'index_patterns', 'order', 'version', 'composed_of']);
  });

  router.get('/plugins', (req, res) => {
    formatResults(res, req, [], ['name', 'component', 'version', 'description']);
  });

  router.get('/master', (req, res) => {
    const data = [
      {
        id: 'mock-node-id',
        host: '127.0.0.1',
        ip: '127.0.0.1',
        node: 'elastic-mock',
      },
    ];
    formatResults(res, req, data, ['id', 'host', 'ip', 'node']);
  });

  router.get('/nodeattrs', (req, res) => {
    formatResults(res, req, [], ['node', 'host', 'ip', 'attr', 'value']);
  });

  router.get('/thread_pool/:thread_pool_patterns?', (req, res) => {
    const data = [
      {
        node_name: 'elastic-mock',
        name: 'search',
        active: 0,
        queue: 0,
        rejected: 0,
        completed: 10,
        size: 5,
      },
      {
        node_name: 'elastic-mock',
        name: 'write',
        active: 0,
        queue: 0,
        rejected: 0,
        completed: 10,
        size: 5,
      },
    ];
    formatResults(res, req, data, ['node_name', 'name', 'active', 'queue', 'rejected', 'completed', 'size']);
  });

  router.get('/', (req, res) => {
    const helpText = `
/_cat/allocation
/_cat/shards
/_cat/shards/{index}
/_cat/master
/_cat/nodes
/_cat/tasks
/_cat/indices
/_cat/indices/{index}
/_cat/segments
/_cat/segments/{index}
/_cat/count
/_cat/count/{index}
/_cat/recovery
/_cat/recovery/{index}
/_cat/health
/_cat/pending_tasks
/_cat/aliases
/_cat/aliases/{alias}
/_cat/thread_pool
/_cat/thread_pool/{thread_pools}
/_cat/plugins
/_cat/fielddata
/_cat/fielddata/{fields}
/_cat/nodeattrs
/_cat/templates
/_cat/ml/anomaly_detectors
/_cat/ml/anomaly_detectors/{job_id}
/_cat/ml/trained_models
/_cat/ml/trained_models/{model_id}
/_cat/ml/data_frame/analytics
/_cat/ml/data_frame/analytics/{id}
/_cat/ml/datafeeds
/_cat/ml/datafeeds/{datafeed_id}
/_cat/component_templates
/_cat/component_templates/{name}
/_cat/transforms
/_cat/transforms/{transform_id}
`.trim();
    res.type('text/plain').send(helpText);
  });

  return router;
}
