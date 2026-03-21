const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');

const router = Router();

router.get('/', async (req, res) => {
  const checks = {
    api: 'healthy',
    dynamodb: 'unknown',
    groq_configured: !!config.groq.apiKey,
    nova_act_configured: !!config.novaAct.apiKey,
    clickup_configured: !!config.clickup.clientId,
    slack_configured: !!config.slack.botToken,
    google_configured: !!config.google.clientId,
    whatsapp_configured: !!config.whatsapp.accessToken,
    uptime_seconds: Math.floor(process.uptime()),
    node_version: process.version,
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };

  try {
    await dynamoClient.scan(config.aws.tables.jobs, null, null);
    checks.dynamodb = 'healthy';
  } catch (err) {
    checks.dynamodb = 'unhealthy';
    if (req.query.debug === '1') {
      checks.dynamodb_error = String(err?.message || err).slice(0, 300);
      checks.dynamodb_table = config.aws.tables.jobs;
    }
  }

  const allHealthy = checks.api === 'healthy' && checks.dynamodb === 'healthy';
  res.status(allHealthy ? 200 : 503).json(checks);
});

module.exports = router;
