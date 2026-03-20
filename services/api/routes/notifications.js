const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { JOB_STATUSES } = require('@erwin-os/schemas');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = '50' } = req.query;
    const allJobs = await dynamoClient.scan(config.aws.tables.jobs);

    const notifications = [];

    const recentJobs = allJobs
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, parseInt(limit));

    for (const job of recentJobs) {
      if (job.status === JOB_STATUSES.NEW) {
        notifications.push({
          id: `new-${job.job_id}`,
          type: 'new_job',
          title: `New task: ${job.title}`,
          message: `From ${job.source_system}`,
          job_id: job.job_id,
          timestamp: job.created_at,
          read: false,
        });
      } else if (job.status === JOB_STATUSES.VERIFICATION_FAILED) {
        notifications.push({
          id: `fail-${job.job_id}`,
          type: 'verification_failed',
          title: `Verification failed: ${job.title}`,
          message: job.review_notes || 'Check run details',
          job_id: job.job_id,
          timestamp: job.updated_at,
          read: false,
        });
      } else if (job.status === JOB_STATUSES.COMPLETED) {
        notifications.push({
          id: `done-${job.job_id}`,
          type: 'completed',
          title: `Ready for review: ${job.title}`,
          message: 'Documentation complete',
          job_id: job.job_id,
          timestamp: job.updated_at,
          read: false,
        });
      }
    }

    notifications.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    res.json({ notifications: notifications.slice(0, parseInt(limit)), total: notifications.length });
  } catch (err) {
    logger.error('api-notifications', 'Failed to get notifications', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
