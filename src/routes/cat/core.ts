import { Router } from 'express';
import { globalStore } from '../../store.js';
import { formatResults } from './utils.js';

export const coreRouter = Router();

coreRouter.get('/health', (req, res) => {
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

coreRouter.get('/indices/:index?', (req, res) => {
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

coreRouter.get('/nodes', (req, res) => {
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

coreRouter.get('/count/:index?', (req, res) => {
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

coreRouter.get('/shards/:index?', (req, res) => {
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

coreRouter.get('/allocation/:node?', (req, res) => {
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

coreRouter.get('/master', (req, res) => {
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
