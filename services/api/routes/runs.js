const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');

const router = Router();

router.get('/:id', async (req, res) => {
  try {
    const run = await dynamoClient.get(config.aws.tables.runs, { run_id: req.params.id });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    logger.error('api-runs', 'Failed to get run', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/steps', async (req, res) => {
  try {
    const run = await dynamoClient.get(config.aws.tables.runs, { run_id: req.params.id });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json({ run_id: run.run_id, job_id: run.job_id, steps: run.steps || [] });
  } catch (err) {
    logger.error('api-runs', 'Failed to get run steps', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
