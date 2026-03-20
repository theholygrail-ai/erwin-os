const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { JOB_STATUSES } = require('@erwin-os/schemas');
const { costTracker } = require('@erwin-os/shared/cost-tracker');

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const allJobs = await dynamoClient.scan(config.aws.tables.jobs);

    const byStatus = {};
    for (const job of allJobs) {
      const s = job.status || 'unknown';
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    res.json({
      total: allJobs.length,
      byStatus,
      new: byStatus[JOB_STATUSES.NEW] || 0,
      triaged: byStatus[JOB_STATUSES.TRIAGED] || 0,
      in_progress: byStatus[JOB_STATUSES.IN_PROGRESS] || 0,
      awaiting_verification: byStatus[JOB_STATUSES.AWAITING_VERIFICATION] || 0,
      verification_failed: byStatus[JOB_STATUSES.VERIFICATION_FAILED] || 0,
      completed: byStatus[JOB_STATUSES.COMPLETED] || 0,
      submitted: byStatus[JOB_STATUSES.SUBMITTED] || 0,
      archived: byStatus[JOB_STATUSES.ARCHIVED] || 0,
    });
  } catch (err) {
    logger.error('api-dashboard', 'Failed to get stats', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const allJobs = await dynamoClient.scan(config.aws.tables.jobs);
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const last24h = allJobs.filter(j => j.created_at >= oneDayAgo);
    const completed24h = allJobs.filter(j => j.status === JOB_STATUSES.COMPLETED && j.updated_at >= oneDayAgo);
    const failed24h = allJobs.filter(j => j.status === JOB_STATUSES.VERIFICATION_FAILED && j.updated_at >= oneDayAgo);

    const costs = costTracker.getReport();

    res.json({
      last24h: {
        created: last24h.length,
        completed: completed24h.length,
        failed: failed24h.length,
      },
      costs,
      queueDepth: allJobs.filter(j => [JOB_STATUSES.NEW, JOB_STATUSES.TRIAGED].includes(j.status)).length,
      agentUtilization: allJobs.filter(j => j.status === JOB_STATUSES.IN_PROGRESS).length,
    });
  } catch (err) {
    logger.error('api-dashboard', 'Failed to get metrics', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
