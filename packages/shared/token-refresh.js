const { google } = require('googleapis');
const { config } = require('./config');
const { logger } = require('./logger');
const { dynamoClient } = require('./aws-clients');

async function refreshGoogleTokens(existingTokens) {
  const oauth2 = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
  oauth2.setCredentials(existingTokens);

  try {
    const { credentials } = await oauth2.refreshAccessToken();

    await dynamoClient.update(
      config.aws.tables.connectors,
      { connector_name: 'google' },
      'SET config.tokens = :tokens, last_sync = :now',
      {
        ':tokens': credentials,
        ':now': new Date().toISOString(),
      }
    );

    logger.info('token-refresh', 'Google tokens refreshed');
    return credentials;
  } catch (err) {
    logger.error('token-refresh', 'Google token refresh failed', { error: err.message });
    throw err;
  }
}

async function refreshClickUpToken() {
  logger.info('token-refresh', 'ClickUp tokens do not expire (personal token) or use OAuth code flow');
}

async function checkAndRefreshTokens() {
  try {
    const googleConnector = await dynamoClient.get(config.aws.tables.connectors, { connector_name: 'google' });
    if (googleConnector?.config?.tokens) {
      const tokens = googleConnector.config.tokens;
      if (tokens.expiry_date && tokens.expiry_date < Date.now() + 300_000) {
        await refreshGoogleTokens(tokens);
      }
    }
  } catch (err) {
    logger.error('token-refresh', 'Token check failed', { error: err.message });
  }
}

module.exports = { refreshGoogleTokens, refreshClickUpToken, checkAndRefreshTokens };
