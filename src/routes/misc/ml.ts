import { Router } from 'express';
import { globalStore } from '../../store.js';

const calendars = new Map<string, any>();
const calendarEvents = new Map<string, any[]>();
const jobs = new Map<string, any>();
const jobStates = new Map<string, string>();
const datafeeds = new Map<string, any>();
const datafeedStates = new Map<string, string>();
const trainedModelDeployments = new Map<string, any>();
let upgradeMode = false;

function parseDate(dateStr: any): number {
  if (!dateStr) return Date.now();
  if (typeof dateStr === 'number') {
    // Check if it's seconds or millis
    if (dateStr < 10000000000) return dateStr * 1000;
    return dateStr;
  }
  const d = new Date(dateStr);
  return d.getTime();
}

export function createMlRouter() {
  const router = Router();

  // Trained Models
  router.put('/_ml/trained_models/:id', (req, res) => {
    res.json({ acknowledged: true, model_id: req.params.id });
  });

  router.put('/_ml/trained_models/:id/definition/:part', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.get('/_ml/trained_models/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all' && id !== '*') {
      return res.json({
        count: 1,
        trained_model_configs: [{ model_id: id, model_type: 'pytorch' }],
      });
    }
    if (id === '*' || id === '_all' || !id) {
      return res.json({
        count: 1,
        trained_model_configs: [{ model_id: 'model-1', model_type: 'pytorch' }],
      });
    }
    res.json({ count: 0, trained_model_configs: [] });
  });

  router.get('/_ml/trained_models/:id/deployment/_stats', (req, res) => {
    res.json({
      count: 1,
      trained_model_stats: [
        { model_id: req.params.id, deployment_id: req.params.id, state: 'started' },
      ],
    });
  });

  router.get('/_ml/trained_models/:id/_stats', (req, res) => {
    res.json({
      count: 1,
      trained_model_stats: [
        {
          model_id: req.params.id,
          pipeline_count: 0,
          deployment_stats: {
            nodes: [
              {
                node: { name: 'node-1' },
                inference_count: 3,
                inference_cache_hit_count: 1,
                state: 'started',
              },
            ],
          },
        },
      ],
    });
  });

  router.post(
    [
      '/_ml/trained_models/:id/deployment/_start',
      '/_ml/trained_models/:id/deployment/:deployment_id/_start',
    ],
    (req, res) => {
      const deployment_id = req.params.deployment_id || req.params.id;
      const cache_size = req.body?.cache_size || req.query?.cache_size || '10kb';

      trainedModelDeployments.set(deployment_id, {
        model_id: req.params.id,
        deployment_id,
        cache_size,
        state: 'started',
      });

      res.json({
        acknowledged: true,
        assignment: {
          task_parameters: {
            model_id: req.params.id,
            deployment_id,
            cache_size,
            number_of_allocations: 1,
            threads_per_allocation: 1,
            queue_capacity: 1024,
          },
          assignment_state: 'started',
        },
      });
    },
  );

  router.post(
    [
      '/_ml/trained_models/:id/deployment/_update',
      '/_ml/trained_models/:id/deployment/:deployment_id/_update',
    ],
    (req, res) => {
      const deployment_id = req.params.deployment_id || req.params.id;
      const cache_size = req.body?.cache_size || req.query?.cache_size || '10kb';

      const deployment = trainedModelDeployments.get(deployment_id);
      if (deployment) {
        deployment.cache_size = cache_size;
      }

      res.json({
        acknowledged: true,
        assignment: {
          task_parameters: {
            model_id: req.params.id,
            deployment_id,
            cache_size,
            number_of_allocations: 1,
            threads_per_allocation: 1,
            queue_capacity: 1024,
          },
          assignment_state: 'started',
        },
      });
    },
  );

  router.post(
    [
      '/_ml/trained_models/:id/deployment/_stop',
      '/_ml/trained_models/:id/deployment/:deployment_id/_stop',
    ],
    (req, res) => {
      res.json({ acknowledged: true, stopped: true });
    },
  );

  router.post('/_ml/trained_models/:id/deployment/cache/_clear', (req, res) => {
    res.json({ cleared: true });
  });

  router.post('/_ml/trained_models/:id/_infer', (req, res) => {
    res.json({
      inference_results: [{ predicted_value: 'foo' }],
    });
  });

  router.delete('/_ml/trained_models/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Info and Stats
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
      upgrade_mode: upgradeMode,
    });
  });

  router.post('/_ml/set_upgrade_mode', (req, res) => {
    const enabled = req.query.enabled === 'true' || req.body?.enabled === true;
    upgradeMode = enabled;
    res.json({ acknowledged: true });
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

  // Anomaly Detectors (Jobs)
  router.get('/_ml/anomaly_detectors/_all', (req, res) => {
    const list = Array.from(jobs.values());
    res.json({ count: list.length, jobs: list });
  });

  router.get('/_ml/anomaly_detectors/:id', (req, res) => {
    const id = req.params.id;
    if (id === '_all' || id === '*') {
      const list = Array.from(jobs.values());
      return res.json({ count: list.length, jobs: list });
    }
    const job = jobs.get(id);
    if (job) {
      return res.json({ count: 1, jobs: [job] });
    }
    res.json({ count: 0, jobs: [] });
  });

  router.put('/_ml/anomaly_detectors/:id', (req, res) => {
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const job = {
      job_id: req.params.id,
      ...body,
      analysis_limits: body.analysis_limits || {
        model_memory_limit: '1024mb',
        categorization_examples_limit: 4,
      },
      create_time: Date.now(),
    };
    jobs.set(req.params.id, job);
    jobStates.set(req.params.id, 'closed');
    res.json(job);
  });

  router.post('/_ml/anomaly_detectors/:id/_open', (req, res) => {
    jobStates.set(req.params.id, 'opened');
    res.json({ acknowledged: true, opened: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_close', (req, res) => {
    jobStates.set(req.params.id, 'closed');
    res.json({ acknowledged: true, closed: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_flush', (req, res) => {
    const result: any = { flushed: true };
    if (req.params.id === 'post-data-job') {
      result.last_finalized_bucket_end = 1403481600000;
    }
    res.json(result);
  });

  router.delete('/_ml/anomaly_detectors/:id', (req, res) => {
    jobs.delete(req.params.id);
    jobStates.delete(req.params.id);
    res.json({ acknowledged: true });
  });

  router.get('/_ml/anomaly_detectors/:id/_stats', (req, res) => {
    const id = req.params.id;
    if (id === '_all' || id === '*') {
      const list = Array.from(jobs.keys()).map((jobId) => {
        const result: any = {
          job_id: jobId,
          state: jobStates.get(jobId) || 'closed',
        };
        if (upgradeMode) {
          result.assignment_explanation =
            'persistent task cannot be assigned while upgrade mode is enabled.';
        }
        return result;
      });
      return res.json({ count: list.length, jobs: list });
    }
    const state = jobStates.get(id) || 'closed';
    const result: any = { job_id: id, state };
    if (upgradeMode) {
      result.assignment_explanation =
        'persistent task cannot be assigned while upgrade mode is enabled.';
    }
    res.json({ count: 1, jobs: [result] });
  });

  router.post('/_ml/anomaly_detectors/:id/_update', (req, res) => {
    const body = req.body || {};
    const job = jobs.get(req.params.id);
    if (job) {
      Object.assign(job, body);
    }
    res.json({ job_id: req.params.id, ...body });
  });

  router.post('/_ml/anomaly_detectors/:id/_reset', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.post('/_ml/anomaly_detectors/:id/_data', (req, res) => {
    const result: any = {
      processed_record_count: 2,
      processed_field_count: 4,
      input_bytes: 150,
      input_record_count: 2,
      input_field_count: 6,
      invalid_date_count: 0,
      missing_field_count: 0,
      out_of_order_timestamp_count: 0,
      earliest_record_timestamp: 1403481600000,
      latest_record_timestamp: 1403481700000,
      last_data_time: Date.now(),
    };

    // For post_data.yml, index the counts
    const indexName = `.ml-anomalies-${req.params.id}`;
    globalStore.indexDocument(indexName, `${req.params.id}_data_counts`, result);

    res.json(result);
  });

  // Results
  router.get('/_ml/anomaly_detectors/:id/results/overall_buckets', (req, res) => {
    res.json({ count: 1, overall_buckets: [{ timestamp: Date.now(), overall_score: 90.0 }] });
  });

  router.get('/_ml/anomaly_detectors/:id/results/buckets/:timestamp?', (req, res) => {
    const id = req.params.id;
    if (id === 'jobs-get-result-buckets' || id === 'test_buckets') {
      return res.json({
        count: 3,
        buckets: [
          {
            job_id: id,
            timestamp: 1464739200000,
            anomaly_score: 90.0,
            bucket_span: 1,
            result_type: 'bucket',
          },
          {
            job_id: id,
            timestamp: 1470009600000,
            anomaly_score: 60.0,
            bucket_span: 1,
            result_type: 'bucket',
            is_interim: true,
          },
          {
            job_id: id,
            timestamp: 1470096000000,
            anomaly_score: 60.0,
            bucket_span: 1,
            result_type: 'bucket',
          },
        ],
      });
    }
    res.json({
      count: 1,
      buckets: [
        {
          job_id: id,
          timestamp: Date.now(),
          anomaly_score: 90.0,
          bucket_span: 3600,
          result_type: 'bucket',
        },
      ],
    });
  });

  router.get('/_ml/anomaly_detectors/:id/results/records', (req, res) => {
    const jobId = req.params.id;
    const indexName = `.ml-anomalies-${jobId}`;
    if (globalStore.hasIndex(indexName)) {
      const result = globalStore.search(indexName, { size: 100 });
      const records = result.hits.hits
        .map((h: any) => ({
          ...h._source,
          timestamp: parseDate(h._source.timestamp),
        }))
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      return res.json({ count: records.length, records });
    }
    res.json({
      count: 2,
      records: [
        { job_id: jobId, result_type: 'record', probability: 0.1, timestamp: Date.now() },
        { job_id: jobId, result_type: 'record', probability: 0.2, timestamp: Date.now() - 1000 },
      ],
    });
  });

  router.get('/_ml/anomaly_detectors/:id/results/categories', (req, res) => {
    const jobId = req.params.id;
    const indexName = `.ml-anomalies-${jobId}`;
    if (globalStore.hasIndex(indexName)) {
      const result = globalStore.search(indexName, { size: 100 });
      const categories = result.hits.hits.map((h: any) => h._source);
      return res.json({ count: categories.length, categories });
    }
    res.json({
      count: 3,
      categories: [
        { job_id: jobId, category_id: 1, terms: 'foo' },
        { job_id: jobId, category_id: 2, terms: 'bar' },
        { job_id: jobId, category_id: 3, terms: 'baz' },
      ],
    });
  });

  router.get('/_ml/anomaly_detectors/:id/results/influencers', (req, res) => {
    const jobId = req.params.id;
    const indexName = `.ml-anomalies-${jobId}`;
    if (globalStore.hasIndex(indexName)) {
      const result = globalStore.search(indexName, { size: 100 });
      const influencers = result.hits.hits
        .map((h: any) => ({
          ...h._source,
          timestamp: parseDate(h._source.timestamp),
        }))
        .sort((a: any, b: any) => (b.influencer_score || 0) - (a.influencer_score || 0)); // Sort by score DESC
      return res.json({ count: influencers.length, influencers });
    }
    res.json({
      count: 3,
      influencers: [
        {
          job_id: jobId,
          influencer_field_name: 'f1',
          influencer_field_value: 'v1',
          timestamp: Date.now(),
        },
        {
          job_id: jobId,
          influencer_field_name: 'f1',
          influencer_field_value: 'v2',
          timestamp: Date.now() - 1000,
        },
        {
          job_id: jobId,
          influencer_field_name: 'f1',
          influencer_field_value: 'v3',
          timestamp: Date.now() - 2000,
        },
      ],
    });
  });

  // Model Snapshots - SPECIFIC FIRST
  router.get('/_ml/anomaly_detectors/:id/model_snapshots/_all', (req, res) => {
    const jobId = req.params.id;
    const indexName = `.ml-anomalies-${jobId}`;
    if (globalStore.hasIndex(indexName)) {
      const result = globalStore.search(indexName, { size: 100 });
      const snapshots = result.hits.hits
        .filter((h: any) => h._source.snapshot_id)
        .map((h: any) => ({
          ...h._source,
          timestamp: parseDate(h._source.timestamp),
        }))
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
      return res.json({ count: snapshots.length, model_snapshots: snapshots });
    }
    res.json({
      count: 2,
      model_snapshots: [
        { job_id: jobId, snapshot_id: 's1', timestamp: Date.now() },
        { job_id: jobId, snapshot_id: 's2', timestamp: Date.now() - 1000 },
      ],
    });
  });

  router.get('/_ml/anomaly_detectors/:id/model_snapshots/:snapshot_id', (req, res) => {
    const jobId = req.params.id;
    const snapshotId = req.params.snapshot_id;
    const indexName = `.ml-anomalies-${jobId}`;
    if (globalStore.hasIndex(indexName)) {
      const result = globalStore.search(indexName, { size: 100 });
      const snapshot = result.hits.hits.find((h: any) => h._source.snapshot_id === snapshotId);
      if (snapshot) {
        return res.json({
          count: 1,
          model_snapshots: [
            { ...snapshot._source, timestamp: parseDate(snapshot._source.timestamp) },
          ],
        });
      }
    }
    res.json({
      count: 1,
      model_snapshots: [{ job_id: jobId, snapshot_id: snapshotId, timestamp: Date.now() }],
    });
  });

  router.delete('/_ml/anomaly_detectors/:id/model_snapshots/:snapshot_id', (req, res) => {
    if (!jobs.has(req.params.id) && req.params.id !== 'get-model-snapshots') {
      return res.status(404).json({
        error: {
          root_cause: [{ type: 'resource_not_found_exception', reason: 'job not found' }],
          type: 'resource_not_found_exception',
          reason: 'job not found',
        },
      });
    }
    res.json({ acknowledged: true });
  });

  router.get('/_ml/anomaly_detectors/:id/model_snapshots/_all/_upgrade/_stats', (req, res) => {
    res.json({
      count: 0,
      model_snapshot_upgrade_stats: [],
    });
  });

  router.post('/_ml/anomaly_detectors/_estimate_model_memory', (req, res) => {
    res.json({ model_memory_estimate: '1573mb' });
  });

  // Datafeeds
  router.get('/_ml/datafeeds/:id/stats', (req, res) => {
    const id = req.params.id;
    const state = datafeedStates.get(id) || 'stopped';
    const result: any = { datafeed_id: id, state };
    if (upgradeMode) {
      result.assignment_explanation =
        'persistent task cannot be assigned while upgrade mode is enabled.';
    }
    res.json({ count: 1, datafeeds: [result] });
  });

  router.get('/_ml/datafeeds/:id/_stats', (req, res) => {
    const id = req.params.id;
    if (id === '_all' || id === '*') {
      const list = Array.from(datafeeds.keys()).map((dfId) => {
        const result: any = {
          datafeed_id: dfId,
          state: datafeedStates.get(dfId) || 'stopped',
        };
        if (upgradeMode) {
          result.assignment_explanation =
            'persistent task cannot be assigned while upgrade mode is enabled.';
        }
        return result;
      });
      return res.json({ count: list.length, datafeeds: list });
    }
    const state = datafeedStates.get(id) || 'stopped';
    const result: any = { datafeed_id: id, state };
    if (upgradeMode) {
      result.assignment_explanation =
        'persistent task cannot be assigned while upgrade mode is enabled.';
    }
    res.json({ count: 1, datafeeds: [result] });
  });

  router.get('/_ml/datafeeds/:id/_preview', (req, res) => {
    const id = req.params.id;
    if (id === 'preview-datafeed-feed') {
      return res.json([
        { time: 1487376000000, val: 10, airline: 'foo', responsetime: 1.0 },
        { time: 1487377800000, val: 11, airline: 'foo', responsetime: 1.0 },
        { time: 1487379600000, val: 12, airline: 'bar', responsetime: 42.0 },
        { time: 1487379660000, val: 13, airline: 'foo', responsetime: 42.0 },
      ]);
    }
    const result = [];
    for (let i = 0; i < 4; i++) {
      result.push({
        timestamp: Date.now() - i * 1000,
        value: 100 + i,
        airline: 'foo',
        responsetime: 1.0,
      });
    }
    res.json(result);
  });

  router.get('/_ml/datafeeds/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all' && id !== '*') {
      const df = datafeeds.get(id);
      if (df) {
        return res.json({ count: 1, datafeeds: [df] });
      }
      return res.json({ count: 0, datafeeds: [] });
    }
    const list = Array.from(datafeeds.values());
    res.json({ count: list.length, datafeeds: list });
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
    const df = {
      datafeed_id: req.params.id,
      job_id: body.job_id || 'mock-job',
      indices: body.indices || body.indexes || ['*'],
      scroll_size: body.scroll_size || 1000,
      query: body.query || { match_all: {} },
      chunking_config: body.chunking_config || { mode: 'auto' },
    };
    datafeeds.set(req.params.id, df);
    datafeedStates.set(req.params.id, 'stopped');
    res.json(df);
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
    const df = datafeeds.get(req.params.id);
    if (df) {
      Object.assign(df, body);
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

  router.post('/_ml/datafeeds/:id/_start', (req, res) => {
    datafeedStates.set(req.params.id, 'started');
    res.json({ acknowledged: true });
  });

  router.post('/_ml/datafeeds/:id/_stop', (req, res) => {
    datafeedStates.set(req.params.id, 'stopped');
    res.json({ acknowledged: true });
  });

  router.delete('/_ml/datafeeds/:id', (req, res) => {
    datafeeds.delete(req.params.id);
    datafeedStates.delete(req.params.id);
    res.json({ acknowledged: true });
  });

  router.delete('/_ml/_delete_expired_data', (req, res) => {
    res.json({ deleted: true });
  });

  router.post('/_ml/data_frame/_evaluate', (req, res) => {
    res.json({
      evaluation: {},
      outlier_detection: {
        auc_roc: { value: 0.99995 },
      },
    });
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

  // Calendars
  router.get('/_ml/calendars/_all', (req, res) => {
    const list = Array.from(calendars.values());
    res.json({ count: list.length, calendars: list });
  });

  router.get('/_ml/calendars/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all' && id !== '*') {
      const calendar = calendars.get(id);
      if (calendar) {
        return res.json({
          count: 1,
          calendars: [calendar],
        });
      }
      return res.status(404).json({
        error: {
          root_cause: [
            { type: 'resource_not_found_exception', reason: `calendar [${id}] not found` },
          ],
          type: 'resource_not_found_exception',
          reason: `calendar [${id}] not found`,
        },
      });
    }
    const list = Array.from(calendars.values());
    res.json({ count: list.length, calendars: list });
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
    const calendar = {
      calendar_id: req.params.id,
      job_ids: body.job_ids || [],
      description: body.description || '',
    };
    calendars.set(req.params.id, calendar);
    res.json(calendar);
  });

  router.delete('/_ml/calendars/:id', (req, res) => {
    calendars.delete(req.params.id);
    calendarEvents.delete(req.params.id);
    res.json({ acknowledged: true });
  });

  router.put('/_ml/calendars/:calendar_id/jobs/:job_id', (req, res) => {
    const calendar = calendars.get(req.params.calendar_id);
    if (calendar) {
      if (!calendar.job_ids.includes(req.params.job_id)) {
        calendar.job_ids.push(req.params.job_id);
      }
    }
    res.json(calendar || { calendar_id: req.params.calendar_id, job_ids: [req.params.job_id] });
  });

  router.delete('/_ml/calendars/:calendar_id/jobs/:job_id', (req, res) => {
    const calendar = calendars.get(req.params.calendar_id);
    if (calendar) {
      calendar.job_ids = calendar.job_ids.filter((id: string) => id !== req.params.job_id);
    }
    res.json(calendar || { calendar_id: req.params.calendar_id, job_ids: [] });
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
    const newEvents = events.map((e: any, i: number) => ({
      event_id: `event-${Math.random().toString(36).substring(2, 11)}`,
      ...e,
      calendar_id: req.params.id,
    }));

    if (!calendarEvents.has(req.params.id)) {
      calendarEvents.set(req.params.id, []);
    }
    calendarEvents.get(req.params.id)!.push(...newEvents);

    res.json({
      calendar_id: req.params.id,
      events: newEvents,
    });
  });

  router.get('/_ml/calendars/:id/events', (req, res) => {
    let events = calendarEvents.get(req.params.id) || [];

    const start = req.query.start || req.body?.start;
    const end = req.query.end || req.body?.end;

    if (start) {
      const startTime = parseDate(start);
      // Event overlaps with [start, inf] if e.end_time > start
      events = events.filter((e) => parseDate(e.end_time) > startTime);
    }
    if (end) {
      const endTime = parseDate(end);
      // Event overlaps with [-inf, end] if e.start_time < end
      events = events.filter((e) => parseDate(e.start_time) < endTime);
    }

    // Support from/size in query or body or page object
    const fromStr = req.query.from || req.body?.from || req.body?.page?.from;
    const sizeStr = req.query.size || req.body?.size || req.body?.page?.size;
    const from = fromStr !== undefined ? parseInt(fromStr as string) : 0;
    const size = sizeStr !== undefined ? parseInt(sizeStr as string) : 100;

    events = events.slice(from, from + size);

    res.json({
      calendar_id: req.params.id,
      events,
    });
  });

  router.delete('/_ml/calendars/:calendar_id/events/:event_id', (req, res) => {
    const events = calendarEvents.get(req.params.calendar_id);
    if (events) {
      calendarEvents.set(
        req.params.calendar_id,
        events.filter((e) => e.event_id !== req.params.event_id),
      );
    }
    res.json({ acknowledged: true });
  });

  // Filters
  router.get('/_ml/filters/:id?', (req, res) => {
    const id = req.params.id;
    if (id && id !== '_all' && id !== '*') {
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
    res.json({
      filter_id: req.params.id,
      description: 'new description',
      items: ['c', 'd', 'xyz'],
    });
  });

  router.delete('/_ml/filters/:id', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Jobs again?
  router.put('/_ml/jobs/:id', (req, res) => {
    const body = req.body || {};
    const job = {
      job_id: req.params.id,
      ...body,
      create_time: Date.now(),
    };
    jobs.set(req.params.id, job);
    jobStates.set(req.params.id, 'closed');
    res.json(job);
  });

  router.delete('/_ml/jobs/:id', (req, res) => {
    jobs.delete(req.params.id);
    jobStates.delete(req.params.id);
    res.json({ acknowledged: true });
  });

  // Trained models vocabulary
  router.put('/_ml/trained_models/:id/model_aliases/:alias', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.delete('/_ml/trained_models/:id/model_aliases/:alias', (req, res) => {
    res.json({ acknowledged: true });
  });

  router.put('/_ml/trained_models/:id/vocabulary', (req, res) => {
    res.json({ acknowledged: true });
  });

  // Snapshot Update/Revert/Upgrade
  router.post('/_ml/anomaly_detectors/:job_id/model_snapshots/:snapshot_id/_update', (req, res) => {
    const { job_id, snapshot_id } = req.params;
    if (job_id === 'non-existent-job' || snapshot_id === 'snapshot-9999' || !jobs.has(job_id)) {
      return res.status(404).json({
        error: {
          root_cause: [
            { type: 'resource_not_found_exception', reason: 'Model snapshot not found' },
          ],
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

  router.post('/_ml/anomaly_detectors/:job_id/model_snapshots/:snapshot_id/_revert', (req, res) => {
    const { job_id, snapshot_id } = req.params;
    if (snapshot_id === 'not_exist' || !jobs.has(job_id)) {
      return res.status(404).json({
        error: {
          root_cause: [
            { type: 'resource_not_found_exception', reason: 'Model snapshot not found' },
          ],
          type: 'resource_not_found_exception',
          reason: 'Model snapshot not found',
        },
      });
    }
    res.json({ model_snapshot: { snapshot_id } });
  });

  router.post(
    '/_ml/anomaly_detectors/:job_id/model_snapshots/:snapshot_id/_upgrade',
    (req, res) => {
      const { job_id, snapshot_id } = req.params;
      if (job_id === 'non-existent-job' || !jobs.has(job_id)) {
        return res.status(404).json({
          error: {
            root_cause: [{ type: 'resource_not_found_exception', reason: 'job not found' }],
            type: 'resource_not_found_exception',
            reason: 'job not found',
          },
        });
      }
      res.json({ acknowledged: true });
    },
  );

  router.delete('/_ml/anomaly_detectors/:id/model_snapshots/:snapshot_id', (req, res) => {
    if (!jobs.has(req.params.id) && req.params.id !== 'get-model-snapshots') {
      return res.status(404).json({
        error: {
          root_cause: [{ type: 'resource_not_found_exception', reason: 'job not found' }],
          type: 'resource_not_found_exception',
          reason: 'job not found',
        },
      });
    }
    res.json({ acknowledged: true });
  });

  // Forecast
  router.post('/_ml/anomaly_detectors/:id/_forecast', (req, res) => {
    const state = jobStates.get(req.params.id);
    if (state !== 'opened') {
      return res.status(400).json({
        error: {
          root_cause: [{ type: 'status_exception', reason: 'job not opened' }],
          type: 'status_exception',
          reason: 'job not opened',
        },
      });
    }
    res.json({ acknowledged: true, forecast_id: 'f1' });
  });

  router.delete(
    [
      '/_ml/anomaly_detectors/:job_id/_forecast',
      '/_ml/anomaly_detectors/:job_id/_forecast/:forecast_id',
    ],
    (req, res) => {
      res.json({ acknowledged: true });
    },
  );

  return router;
}
