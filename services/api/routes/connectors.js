const { Router } = require('express');
const { ClickUpConnector } = require('@erwin-os/connectors/clickup');
const { SlackConnector } = require('@erwin-os/connectors/slack');
const { GmailConnector } = require('@erwin-os/connectors/gmail');
const { GoogleDriveConnector } = require('@erwin-os/connectors/google-drive');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const connectors = await dynamoClient.scan(config.aws.tables.connectors);
    const statusChecks = [];

    if (config.slack.botToken) {
      const slack = new SlackConnector();
      statusChecks.push(slack.healthCheck());
    }

    const results = await Promise.allSettled(statusChecks);
    const healthResults = results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', error: r.reason?.message });

    res.json({
      connectors: connectors.map(c => ({
        name: c.connector_name,
        status: c.status,
        last_sync: c.last_sync,
      })),
      health: healthResults,
    });
  } catch (err) {
    logger.error('api-connectors', 'Failed to get status', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:name/oauth', async (req, res) => {
  try {
    const { name } = req.params;
    let authUrl;

    switch (name) {
      case 'clickup':
        authUrl = ClickUpConnector.getOAuthUrl();
        break;
      case 'google':
        authUrl = GmailConnector.getAuthUrl();
        break;
      default:
        return res.status(400).json({ error: `Unknown connector: ${name}` });
    }

    res.json({ auth_url: authUrl });
  } catch (err) {
    logger.error('api-connectors', 'OAuth initiation failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/clickup/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    const tokens = await ClickUpConnector.exchangeCode(code);

    await dynamoClient.put(config.aws.tables.connectors, {
      connector_name: 'clickup',
      status: 'connected',
      last_sync: new Date().toISOString(),
      config: { access_token_set: true },
    });

    res.json({ success: true, message: 'ClickUp connected' });
  } catch (err) {
    logger.error('api-connectors', 'ClickUp OAuth callback failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/google/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing authorization code' });

    const tokens = await GmailConnector.exchangeCode(code);

    await dynamoClient.put(config.aws.tables.connectors, {
      connector_name: 'google',
      status: 'connected',
      last_sync: new Date().toISOString(),
      config: { tokens_set: true },
    });

    res.json({ success: true, message: 'Google Workspace connected' });
  } catch (err) {
    logger.error('api-connectors', 'Google OAuth callback failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/:name/test', async (req, res) => {
  try {
    const { name } = req.params;
    let result;

    switch (name) {
      case 'slack':
        result = await new SlackConnector().healthCheck();
        break;
      default:
        return res.json({ status: 'unknown', message: `Test not implemented for ${name}` });
    }

    res.json(result);
  } catch (err) {
    logger.error('api-connectors', 'Connection test failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
