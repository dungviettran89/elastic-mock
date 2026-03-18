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

  return router;
}
