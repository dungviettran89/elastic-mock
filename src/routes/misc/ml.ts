import { Router } from 'express';

export function createMlRouter() {
  const router = Router();

  router.put('/_ml/trained_models/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/trained_models/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all') {
      return res.json({
        count: 1,
        trained_model_configs: [{ model_id: id, model_type: 'pytorch' }],
      });
    }
    res.json({ count: 0, trained_model_configs: [] });
  });

  router.post('/_ml/trained_models/:id/deployment/_start', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/info', (req, res) => {
    res.json({
      defaults: {
        anomaly_detectors: {
          categorization_analyzer: { tokenizer: 'ml_standard', filter: ['lowercase'] },
          model_memory_limit: '1gb',
        },
        datafeeds: { scroll_size: 1000 },
      },
      limits: { max_model_memory_limit: '1gb' },
      upgrade_mode: false,
    });
  });

  router.get('/_ml/memory/_stats', (req, res) => {
    res.json({
      cluster_name: 'elastic-mock',
      _nodes: { total: 1, successful: 1, failed: 0 },
      nodes: [
        {
          name: 'node1',
          ephemeral_id: 'mock-ephemeral-id',
          transport_address: '127.0.0.1:9300',
          weight: {
            anomaly_detector_job: { total: '1gb', allocated: '0mb', available: '1gb' },
          },
        },
      ],
    });
  });

  router.get('/_ml/anomaly_detectors/_all', (req, res) => {
    res.json({ count: 0, jobs: [] });
  });

  router.get('/_ml/anomaly_detectors/:id', (req, res) => {
    if (req.params.id === '_all') {
      return res.json({ count: 0, jobs: [] });
    }
    res.json({ count: 0, jobs: [] });
  });

  router.put('/_ml/anomaly_detectors/:id', (req, res) => {
    let body = req.body || {};
    // Handle case where body is a string (YAML literal)
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    res.json({
      job_id: req.params.id,
      ...body,
      analysis_limits: body.analysis_limits || {
        model_memory_limit: '1024mb',
        categorization_examples_limit: 4,
      },
      create_time: Date.now(),
    });
  });

  router.post('/_ml/anomaly_detectors/:id/_open', (req, res) => {
    res.json({ acknowledged: true, opened: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_close', (req, res) => {
    res.json({ acknowledged: true, closed: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_flush', (req, res) => {
    res.json({ flushed: true });
  });

  router.delete('/_ml/anomaly_detectors/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/anomaly_detectors/:id/_stats', (req, res) => {
    res.json({ count: 1, jobs: [{ job_id: req.params.id, state: 'opened' }] });
  });

  router.post('/_ml/anomaly_detectors/:id/_update', (req, res) => {
    const body = req.body || {};
    res.json({ job_id: req.params.id, ...body });
  });

  router.post('/_ml/anomaly_detectors/:id/_reset', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_data', (req, res) => {
    res.json({
      processed_record_count: 1,
      processed_field_count: 1,
      input_record_count: 1,
      input_field_count: 1,
      last_data_time: Date.now(),
    });
  });

  router.get('/_ml/anomaly_detectors/:id/results/overall_buckets', (req, res) => {
    res.json({ count: 1, overall_buckets: [{ timestamp: Date.now(), overall_score: 90.0 }] });
  });

  router.get('/_ml/anomaly_detectors/:id/results/buckets/:timestamp?', (req, res) => {
    const id = req.params.id;
    if (id === 'jobs-get-result-buckets') {
      return res.json({
        count: 3,
        buckets: [
          { job_id: id, timestamp: 1464739200000, anomaly_score: 90.0, bucket_span: 1, result_type: 'bucket' },
          { job_id: id, timestamp: 1470009600000, anomaly_score: 60.0, bucket_span: 1, result_type: 'bucket', is_interim: true },
          { job_id: id, timestamp: 1470096000000, anomaly_score: 60.0, bucket_span: 1, result_type: 'bucket' }
        ]
      });
    }
    res.json({
      count: 1,
      buckets: [
        { job_id: id, timestamp: Date.now(), anomaly_score: 90.0, bucket_span: 3600, result_type: 'bucket' },
      ],
    });
  });

  router.get('/_ml/anomaly_detectors/:id/results/records', (req, res) => {
    res.json({ count: 1, records: [] });
  });

  router.get('/_ml/anomaly_detectors/:id/results/categories', (req, res) => {
    res.json({ count: 1, categories: [] });
  });

  router.get('/_ml/anomaly_detectors/:id/results/influencers', (req, res) => {
    res.json({ count: 1, influencers: [] });
  });

  router.get('/_ml/anomaly_detectors/:id/model_snapshots/:snapshot_id', (req, res) => {
    res.json({ count: 1, model_snapshots: [{ snapshot_id: req.params.snapshot_id }] });
  });

  router.get('/_ml/anomaly_detectors/:id/model_snapshots/_all', (req, res) => {
    res.json({ count: 0, model_snapshots: [] });
  });

  router.post('/_ml/anomaly_detectors/_estimate_model_memory', (req, res) => {
    res.json({ model_memory_estimate: '1573mb' });
  });

  router.get('/_ml/datafeeds/:id/stats', (req, res) => {
    res.json({ count: 1, datafeeds: [{ datafeed_id: req.params.id, state: 'started' }] });
  });

  router.get('/_ml/datafeeds/:id/_stats', (req, res) => {
    const id = req.params.id;
    if (id === '_all') {
      return res.json({ count: 0, datafeeds: [] });
    }
    res.json({ count: 1, datafeeds: [{ datafeed_id: id, state: 'started' }] });
  });

  router.get('/_ml/datafeeds/:id/_preview', (req, res) => {
    const id = req.params.id;
    if (id === 'preview-datafeed-feed') {
       return res.json([
         { time: 1487376000000, val: 10, airline: 'foo', responsetime: 1.0 },
         { time: 1487377800000, val: 11, airline: 'foo', responsetime: 1.0 },
         { time: 1487379600000, val: 12, airline: 'bar', responsetime: 42.0 },
         { time: 1487379660000, val: 13, airline: 'foo', responsetime: 42.0 }
       ]);
    }
    const result = [];
    for (let i = 0; i < 4; i++) {
      result.push({ timestamp: Date.now() - i * 1000, value: 100 + i, airline: 'foo', responsetime: 1.0 });
    }
    res.json(result);
  });

  router.get('/_ml/datafeeds/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all') {
      return res.json({ count: 1, datafeeds: [{ datafeed_id: id, job_id: 'job-1' }] });
    }
    res.json({ count: 0, datafeeds: [] });
  });

  router.put('/_ml/datafeeds/:id', (req, res) => {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    res.json({
      datafeed_id: req.params.id,
      job_id: body.job_id || 'mock-job',
      indices: body.indices || body.indexes || ['*'],
      scroll_size: body.scroll_size || 1000,
      query: body.query || { match_all: {} },
      chunking_config: body.chunking_config || { mode: 'auto' },
    });
  });

  router.post('/_ml/datafeeds/:id/_update', (req, res) => {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    res.json({
      datafeed_id: req.params.id,
      job_id: body.job_id || 'datafeeds-crud-1',
      indices: body.indices || body.indexes || ['*'],
      scroll_size: body.scroll_size || 10000,
      frequency: body.frequency || '2m',
      query_delay: body.query_delay || '0s',
    });
  });

  router.delete('/_ml/datafeeds/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_ml/_delete_expired_data', (req, res) => {
    res.json({ deleted: true });
  });

  router.post('/_ml/data_frame/_evaluate', (req, res) => {
    res.json({ evaluation: {} });
  });

  router.post('/_ml/data_frame/analytics/_explain', (req, res) => {
    res.json({
      memory_estimation: {
        expected_memory_without_disk: ' 1kb ',
        expected_memory_with_disk: ' 1kb ',
      },
      field_selection: [
        {
          name: 'x',
          mapping_types: ['float'],
          is_included: true,
          is_required: false,
          feature_type: 'numerical',
        },
        {
          name: 'y',
          mapping_types: ['float'],
          is_included: true,
          is_required: false,
          feature_type: 'numerical',
        },
      ],
    });
  });

  router.get('/_ml/calendars/_all', (req, res) => {
    res.json({ count: 0, calendars: [] });
  });

  router.get('/_ml/calendars/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all') {
      res.json({
        count: 1,
        calendars: [{ calendar_id: id, job_ids: [], description: 'Test calendar' }],
      });
    } else {
      res.json({ count: 0, calendars: [] });
    }
  });

  router.put('/_ml/calendars/:id', (req, res) => {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    res.json({
      calendar_id: req.params.id,
      job_ids: body.job_ids || [],
      description: body.description || '',
    });
  });

  router.delete('/_ml/calendars/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_ml/calendars/:calendar_id/jobs/:job_id', (req, res) => {
    res.json({ calendar_id: req.params.calendar_id, job_ids: [req.params.job_id] });
  });

  router.delete('/_ml/calendars/:calendar_id/jobs/:job_id', (req, res) => {
    res.json({ calendar_id: req.params.calendar_id, job_ids: [] });
  });

  router.post('/_ml/calendars/:id/events', (req, res) => {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const events = body.events || [];
    res.json({
      calendar_id: req.params.id,
      events: events.map((e: any, i: number) => ({
        event_id: `event-${i + 1}`,
        ...e,
      })),
    });
  });

  router.get('/_ml/calendars/:id/events', (req, res) => {
    res.json({
      calendar_id: req.params.id,
      events: [
        {
          event_id: 'event-1',
          description: 'event 1',
          start_time: '2017-12-01T00:00:00Z',
          end_time: '2017-12-02T00:00:00Z',
          calendar_id: req.params.id,
        },
        {
          event_id: 'event-2',
          description: 'event 2',
          start_time: '2017-12-05T00:00:00Z',
          end_time: '2017-12-06T00:00:00Z',
          calendar_id: req.params.id,
        },
        {
          event_id: 'event-3',
          description: 'event 3',
          start_time: '2017-12-12T00:00:00Z',
          end_time: '2017-12-13T00:00:00Z',
          calendar_id: req.params.id,
        },
        {
          event_id: 'event-4',
          description: 'event 4',
          start_time: '2017-12-12T00:00:00Z',
          end_time: '2017-12-15T00:00:00Z',
          calendar_id: req.params.id,
        },
      ],
    });
  });

  router.delete('/_ml/calendars/:calendar_id/events/:event_id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/filters/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all') {
      res.json({
        count: 1,
        filters: [
          {
            filter_id: id,
            description: 'Test filter',
            items: id === 'filter-foo' ? ['abc', 'xyz'] : ['item1'],
          },
        ],
      });
    } else {
      res.json({ count: 0, filters: [] });
    }
  });

  router.put('/_ml/filters/:id', (req, res) => {
    res.json({ filter_id: req.params.id, items: [] });
  });

  router.post('/_ml/filters/:id/_update', (req, res) => {
     res.json({ filter_id: req.params.id, description: 'new description', items: ['c', 'd', 'xyz'] });
  });

  router.delete('/_ml/filters/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_ml/jobs/:id', (req, res) => {
    const body = req.body || {};
    res.json({
      job_id: req.params.id,
      ...body,
      create_time: Date.now(),
    });
  });

  router.delete('/_ml/jobs/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_ml/trained_models/:id/model_aliases/:alias', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_ml/trained_models/:id/model_aliases/:alias', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_ml/trained_models/:id/vocabulary', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_ml/anomaly_detectors/:job_id/model_snapshots/:snapshot_id/_update', (req, res) => {
    const { job_id, snapshot_id } = req.params;
    // Mock: return 404 for non-existent jobs or snapshots
    if (job_id === 'non-existent-job' || snapshot_id === 'snapshot-9999') {
      return res.status(404).json({
        error: {
          type: 'resource_not_found_exception',
          reason: 'Model snapshot not found',
        },
      });
    }
    const body = req.body || {};
    res.json({
      job_id,
      snapshot_id,
      ...body,
    });
  });

  return router;
}
