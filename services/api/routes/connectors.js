const { Router } = require('express');
const { dynamoClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');

let _ClickUp, _Slack, _Gmail, _Drive;
function getClickUp() { if (!_ClickUp) _ClickUp = require('@erwin-os/connectors/clickup').ClickUpConnector; return _ClickUp; }
function getSlack() { if (!_Slack) _Slack = require('@erwin-os/connectors/slack').SlackConnector; return _Slack; }
function getGmail() { if (!_Gmail) _Gmail = require('@erwin-os/connectors/gmail').GmailConnector; return _Gmail; }
function getDrive() { if (!_Drive) _Drive = require('@erwin-os/connectors/google-drive').GoogleDriveConnector; return _Drive; }

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const connectors = await dynamoClient.scan(config.aws.tables.connectors);
    const statusChecks = [];

    if (config.slack.botToken) {
      const slack = new (getSlack())();
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
        authUrl = getClickUp().getOAuthUrl();
        break;
      case 'google':
        authUrl = getGmail().getAuthUrl();
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

    const tokens = await getClickUp().exchangeCode(code);

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

    const tokens = await getGmail().exchangeCode(code);

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
        result = await new (getSlack())().healthCheck();
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
