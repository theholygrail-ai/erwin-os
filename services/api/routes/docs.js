const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { JOB_STATUSES } = require('@erwin-os/schemas');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const allJobs = await dynamoClient.scan(config.aws.tables.jobs);
    const completedJobs = allJobs.filter(j =>
      [JOB_STATUSES.COMPLETED, JOB_STATUSES.SUBMITTED].includes(j.status)
    );

    completedJobs.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

    const docs = completedJobs.map(j => ({
      job_id: j.job_id,
      title: j.title,
      document_type: j.document_type,
      status: j.status,
      source_system: j.source_system,
      draft_artifact_uri: j.draft_artifact_uri,
      verification_result: j.verification_result,
      created_at: j.created_at,
      updated_at: j.updated_at,
      submitted_at: j.submitted_at,
    }));

    res.json({ docs, total: docs.length });
  } catch (err) {
    logger.error('api-docs', 'Failed to get docs', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
