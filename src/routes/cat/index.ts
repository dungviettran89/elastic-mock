import { Router } from 'express';
import { globalStore } from '../../store.js';
import { formatResults } from './utils.js';

export function createCatRouter() {
  const router = Router();

  router.get('/ml/data_frame/analytics/:id?', (req, res) => {
    formatResults(res, req, [], ['id', 'type', 'description', 'status']);
  });
  router.get('/ml_data_frame_analytics/:id?', (req, res) => {
    formatResults(res, req, [], ['id', 'type', 'description', 'status']);
  });

  router.get('/ml/datafeeds/:datafeed_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'state', 'assignment_explanation']);
  });
  router.get('/ml_datafeeds/:datafeed_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'state', 'assignment_explanation']);
  });

  router.get('/ml/jobs/:job_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'state', 'assignment_explanation']);
  });
  router.get('/ml_jobs/:job_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'state', 'assignment_explanation']);
  });

  router.get('/ml/trained_models/:model_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'created', 'created_by', 'version']);
  });
  router.get('/ml_trained_models/:model_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'created', 'created_by', 'version']);
  });

  router.get('/ml/anomaly_detectors/:job_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'state', 'assignment_explanation']);
  });
  router.get('/ml_anomaly_detectors/:job_id?', (req, res) => {
    formatResults(res, req, [], ['id', 'state', 'assignment_explanation']);
  });

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

  router.get('/shards/:index?', (req, res) => {
    const { index } = req.params;
    const indices = index
      ? [globalStore.getIndex(index)].filter(Boolean)
      : globalStore.getAllIndices();

    const data: any[] = [];
    if (indices.length === 0) {
      data.push({
        index: 'mock-index',
        shard: '0',
        prirep: 'p',
        state: 'STARTED',
        docs: '0',
        store: '1kb',
        ip: '127.0.0.1',
        node: 'elastic-mock',
      });
    } else {
      indices.forEach((idx) => {
        if (idx) {
          data.push({
            index: idx.name || 'mock-index',
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
    }

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

  router.get('/allocation/:node?', (req, res) => {
    const indicesCount = globalStore.getAllIndices().length;
    const data = [
      {
        shards: indicesCount || 1,
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

  router.get('/component_templates/:name?', (req, res) => {
    const data = [
      {
        name: 'metrics',
        version: '1',
        pattern: 'metrics-*',
        order: '0',
      },
    ];
    formatResults(res, req, data, ['name', 'version', 'pattern', 'order']);
  });

  router.get('/fielddata/:fields?', (req, res) => {
    const data = [
      {
        id: 'mock-id',
        host: '127.0.0.1',
        ip: '127.0.0.1',
        node: 'elastic-mock',
        field: 'mock-field',
        size: '1kb',
      },
    ];
    formatResults(res, req, data, ['id', 'host', 'ip', 'node', 'field', 'size']);
  });

  router.get('/repositories', (req, res) => {
    formatResults(res, req, [], ['id', 'type']);
  });

  router.get('/snapshots/:repository?', (req, res) => {
    formatResults(
      res,
      req,
      [],
      [
        'id',
        'repository',
        'status',
        'start_epoch',
        'start_time',
        'end_epoch',
        'end_time',
        'duration',
        'indices',
        'successful_shards',
        'failed_shards',
        'total_shards',
      ],
    );
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

  router.get('/segments/:index?', (req, res) => {
    formatResults(
      res,
      req,
      [],
      [
        'index',
        'shard',
        'prirep',
        'segment',
        'generation',
        'docs.count',
        'docs.deleted',
        'size',
        'size.memory',
        'committed',
        'searchable',
        'version',
        'compound',
      ],
    );
  });

  router.get('/recovery/:index?', (req, res) => {
    formatResults(
      res,
      req,
      [],
      [
        'index',
        'shard',
        'time',
        'type',
        'stage',
        'source_host',
        'source_node',
        'target_host',
        'target_node',
        'repository',
        'snapshot',
        'files',
        'files_recovered',
        'files_percent',
        'bytes',
        'bytes_recovered',
        'bytes_percent',
        'translog_ops',
        'translog_ops_recovered',
        'translog_ops_percent',
      ],
    );
  });

  router.get('/pending_tasks', (req, res) => {
    formatResults(res, req, [], ['insertOrder', 'timeInQueue', 'priority', 'source']);
  });

  router.get('/tasks', (req, res) => {
    formatResults(
      res,
      req,
      [],
      [
        'action',
        'task_id',
        'parent_task_id',
        'type',
        'start_time',
        'timestamp',
        'running_time',
        'ip',
        'node',
      ],
    );
  });

  router.get('/templates/:name?', (req, res) => {
    formatResults(res, req, [], ['name', 'index_patterns', 'order', 'version', 'composed_of']);
  });

  router.get('/plugins', (req, res) => {
    formatResults(res, req, [], ['name', 'component', 'version', 'description']);
  });

  router.get('/nodeattrs', (req, res) => {
    formatResults(res, req, [], ['node', 'host', 'ip', 'attr', 'value']);
  });

  router.get('/circuit_breaker', (req, res) => {
    const data = [
      {
        name: 'request',
        number: 1,
        overhead: 1.0,
        'limit.bytes': 1000000,
        'limit.size': '1mb',
        'estimated.bytes': 0,
        'estimated.size': '0b',
        node_id: 'mock-node-id',
      },
    ];
    formatResults(res, req, data, [
      'name',
      'number',
      'overhead',
      'limit.bytes',
      'limit.size',
      'estimated.bytes',
      'estimated.size',
      'node_id',
    ]);
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
    formatResults(res, req, data, [
      'node_name',
      'name',
      'active',
      'queue',
      'rejected',
      'completed',
      'size',
    ]);
  });

  router.get('/transforms/:transform_id?', (req, res) => {
    const { transform_id } = req.params;
    const data = [
      {
        id: transform_id || 'transform_id',
        state: 'started',
        checkpoint: 1,
        documents_processed: 100,
        checkpoint_duration_time_exp_avg: 10,
        documents_indexed: 100,
        frequency: '1m',
        last_search_time: Date.now(),
        'node.name': 'elastic-mock',
      },
    ];
    formatResults(res, req, data, [
      'id',
      'state',
      'checkpoint',
      'documents_processed',
      'checkpoint_duration_time_exp_avg',
      'documents_indexed',
      'frequency',
      'last_search_time',
      'node.name',
    ]);
  });

  router.get('/', (req, res) => {
    const helpText = `
=^.^=
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
/_cat/circuit_breaker
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
