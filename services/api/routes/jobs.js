const { Router } = require('express');
const { dynamoClient, sqsClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { JOB_STATUSES } = require('@erwin-os/schemas');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, priority, source, limit = '50' } = req.query;

    let items;
    if (status) {
      items = await dynamoClient.query(
        config.aws.tables.jobs,
        '#s = :status',
        { ':status': status },
        { indexName: 'status-created-index', limit: parseInt(limit) }
      );
    } else {
      items = await dynamoClient.scan(config.aws.tables.jobs);
    }

    if (priority) items = items.filter(j => j.priority === parseInt(priority));
    if (source) items = items.filter(j => j.source_system === source);

    items.sort((a, b) => (a.priority || 99) - (b.priority || 99));

    res.json({ jobs: items, total: items.length });
  } catch (err) {
    logger.error('api-jobs', 'Failed to list jobs', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { job_ids, action, data } = req.body || {};
    if (!job_ids || !Array.isArray(job_ids) || !action) {
      return res.status(400).json({ error: 'job_ids (array) and action are required' });
    }

    const results = [];
    for (const jobId of job_ids) {
      try {
        let status;
        switch (action) {
          case 'archive': status = JOB_STATUSES.ARCHIVED; break;
          case 'prioritize': break;
          case 'run': status = JOB_STATUSES.TRIAGED; break;
          default: status = data?.status;
        }

        if (status) {
          await dynamoClient.update(
            config.aws.tables.jobs,
            { job_id: jobId },
            'SET #s = :status, updated_at = :now',
            { ':status': status, ':now': new Date().toISOString() },
            { '#s': 'status' }
          );
        }

        if (action === 'run') {
          await sqsClient.sendMessage(config.aws.sqsJobQueueUrl, { job_id: jobId });
        }

        results.push({ job_id: jobId, success: true });
      } catch (err) {
        results.push({ job_id: jobId, success: false, error: err.message });
      }
    }

    res.json({ results, processed: results.length });
  } catch (err) {
    logger.error('api-jobs', 'Failed to bulk update', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await dynamoClient.get(config.aws.tables.jobs, { job_id: req.params.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const runs = await dynamoClient.query(
      config.aws.tables.runs,
      'job_id = :jobId',
      { ':jobId': req.params.id },
      { indexName: 'job-index' }
    );

    res.json({ ...job, runs });
  } catch (err) {
    logger.error('api-jobs', 'Failed to get job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/run', async (req, res) => {
  try {
    const job = await dynamoClient.get(config.aws.tables.jobs, { job_id: req.params.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await dynamoClient.update(
      config.aws.tables.jobs,
      { job_id: req.params.id },
      'SET #s = :status, updated_at = :now',
      { ':status': JOB_STATUSES.TRIAGED, ':now': new Date().toISOString() },
      { '#s': 'status' }
    );

    await sqsClient.sendMessage(config.aws.sqsJobQueueUrl, { job_id: req.params.id });

    if (req.app.locals.broadcastEvent) {
      req.app.locals.broadcastEvent({ type: 'job_queued', job_id: req.params.id });
    }

    res.json({ queued: true, job_id: req.params.id });
  } catch (err) {
    logger.error('api-jobs', 'Failed to run job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/retry', async (req, res) => {
  try {
    const job = await dynamoClient.get(config.aws.tables.jobs, { job_id: req.params.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await dynamoClient.update(
      config.aws.tables.jobs,
      { job_id: req.params.id },
      'SET #s = :status, updated_at = :now, retry_count = :retryCount',
      {
        ':status': JOB_STATUSES.TRIAGED,
        ':now': new Date().toISOString(),
        ':retryCount': (job.retry_count || 0),
      },
      { '#s': 'status' }
    );

    await sqsClient.sendMessage(config.aws.sqsJobQueueUrl, { job_id: req.params.id });
    res.json({ retried: true, job_id: req.params.id });
  } catch (err) {
    logger.error('api-jobs', 'Failed to retry job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    await dynamoClient.update(
      config.aws.tables.jobs,
      { job_id: req.params.id },
      'SET #s = :status, updated_at = :now, submitted_at = :now',
      { ':status': JOB_STATUSES.SUBMITTED, ':now': new Date().toISOString() },
      { '#s': 'status' }
    );

    if (req.app.locals.broadcastEvent) {
      req.app.locals.broadcastEvent({ type: 'job_approved', job_id: req.params.id });
    }

    res.json({ approved: true, job_id: req.params.id });
  } catch (err) {
    logger.error('api-jobs', 'Failed to approve job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const { notes } = req.body || {};
    await dynamoClient.update(
      config.aws.tables.jobs,
      { job_id: req.params.id },
      'SET #s = :status, updated_at = :now, review_notes = :notes',
      {
        ':status': JOB_STATUSES.VERIFICATION_FAILED,
        ':now': new Date().toISOString(),
        ':notes': notes || 'Manually rejected',
      },
      { '#s': 'status' }
    );

    if (req.app.locals.broadcastEvent) {
      req.app.locals.broadcastEvent({ type: 'job_rejected', job_id: req.params.id });
    }

    res.json({ rejected: true, job_id: req.params.id });
  } catch (err) {
    logger.error('api-jobs', 'Failed to reject job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  if (req.params.id === 'bulk') {
    return res.status(405).json({ error: 'Use POST /jobs/bulk' });
  }
  try {
    const allowedFields = ['status', 'priority', 'title', 'document_type', 'review_notes'];
    const updates = {};
    for (const [key, value] of Object.entries(req.body || {})) {
      if (allowedFields.includes(key)) updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updateParts = ['updated_at = :now'];
    const values = { ':now': new Date().toISOString() };
    const names = {};

    for (const [key, value] of Object.entries(updates)) {
      const safeKey = key === 'status' ? '#s' : key;
      if (key === 'status') names['#s'] = 'status';
      updateParts.push(`${safeKey} = :${key}`);
      values[`:${key}`] = value;
    }

    const result = await dynamoClient.update(
      config.aws.tables.jobs,
      { job_id: req.params.id },
      `SET ${updateParts.join(', ')}`,
      values,
      Object.keys(names).length > 0 ? names : undefined
    );

    if (req.app.locals.broadcastEvent) {
      req.app.locals.broadcastEvent({ type: 'job_updated', job_id: req.params.id, updates });
    }

    res.json(result);
  } catch (err) {
    logger.error('api-jobs', 'Failed to update job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/archive', async (req, res) => {
  try {
    await dynamoClient.update(
      config.aws.tables.jobs,
      { job_id: req.params.id },
      'SET #s = :status, updated_at = :now',
      { ':status': JOB_STATUSES.ARCHIVED, ':now': new Date().toISOString() },
      { '#s': 'status' }
    );
    res.json({ archived: true, job_id: req.params.id });
  } catch (err) {
    logger.error('api-jobs', 'Failed to archive job', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
