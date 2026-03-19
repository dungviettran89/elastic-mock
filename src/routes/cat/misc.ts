import { Router } from 'express';
import { globalStore } from '../../store.js';
import { formatResults } from './utils.js';

export const miscRouter = Router();

miscRouter.get('/aliases/:alias?', (req, res) => {
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

miscRouter.get('/segments/:index?', (req, res) => {
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

miscRouter.get('/recovery/:index?', (req, res) => {
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

miscRouter.get('/pending_tasks', (req, res) => {
  formatResults(res, req, [], ['insertOrder', 'timeInQueue', 'priority', 'source']);
});

miscRouter.get('/tasks', (req, res) => {
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

miscRouter.get('/templates/:name?', (req, res) => {
  formatResults(res, req, [], ['name', 'index_patterns', 'order', 'version', 'composed_of']);
});

miscRouter.get('/plugins', (req, res) => {
  formatResults(res, req, [], ['name', 'component', 'version', 'description']);
});

miscRouter.get('/nodeattrs', (req, res) => {
  formatResults(res, req, [], ['node', 'host', 'ip', 'attr', 'value']);
});

miscRouter.get('/circuit_breaker', (req, res) => {
  formatResults(
    res,
    req,
    [],
    [
      'name',
      'number',
      'overhead',
      'limit.bytes',
      'limit.size',
      'estimated.bytes',
      'estimated.size',
    ],
  );
});

miscRouter.get('/thread_pool/:thread_pool_patterns?', (req, res) => {
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

miscRouter.get('/', (req, res) => {
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
