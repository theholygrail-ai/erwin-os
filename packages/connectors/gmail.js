const { google } = require('googleapis');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { SOURCE_SYSTEMS, normalizeEvent } = require('@erwin-os/schemas');
const { extractDocKeywords } = require('./clickup');

class GmailConnector {
  constructor(tokens) {
    this.name = 'gmail';
    this.oauth2 = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    if (tokens) this.oauth2.setCredentials(tokens);
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2 });
  }

  static getAuthUrl() {
    const oauth2 = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
      ],
    });
  }

  static async exchangeCode(code) {
    const oauth2 = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    const { tokens } = await oauth2.getToken(code);
    return tokens;
  }

  async setupWatch() {
    const res = await this.gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: config.google.pubsubTopic,
        labelIds: ['INBOX'],
      },
    });
    logger.info('gmail-connector', 'Watch setup', {
      historyId: res.data.historyId,
      expiration: res.data.expiration,
    });
    return res.data;
  }

  async processNotification(pubsubMessage) {
    const data = JSON.parse(Buffer.from(pubsubMessage.data, 'base64').toString());
    const { emailAddress, historyId } = data;

    logger.debug('gmail-connector', 'Pub/Sub notification', { emailAddress, historyId });

    const history = await this.gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded'],
    });

    const messages = [];
    for (const record of history.data.history || []) {
      for (const added of record.messagesAdded || []) {
        const msg = await this.getMessage(added.message.id);
        if (msg) messages.push(msg);
      }
    }

    return messages.map(msg => this.normalizeMessage(msg));
  }

  async getMessage(messageId) {
    try {
      const res = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      return res.data;
    } catch (err) {
      logger.error('gmail-connector', 'Failed to get message', { messageId, error: err.message });
      return null;
    }
  }

  async searchMessages(query, maxResults = 20) {
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });
    const messages = [];
    for (const item of res.data.messages || []) {
      const msg = await this.getMessage(item.id);
      if (msg) messages.push(msg);
    }
    return messages;
  }

  normalizeMessage(message) {
    const headers = message.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const body = extractBody(message.payload);

    const normalized = normalizeEvent({
      sourceSystem: SOURCE_SYSTEMS.GMAIL,
      rawEvent: message,
    });

    normalized.event_id = message.id;
    normalized.title = subject;
    normalized.body = body;
    normalized.assignee = parseEmailAddresses(to);
    normalized.linked_refs = [
      { type: 'gmail_message', id: message.id },
      { type: 'gmail_thread', id: message.threadId },
    ];
    normalized.keywords = extractDocKeywords(`${subject} ${body}`.toLowerCase());

    return normalized;
  }

  async healthCheck() {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return { status: 'healthy', connector: this.name };
    } catch (err) {
      return { status: 'unhealthy', connector: this.name, error: err.message };
    }
  }
}

function extractBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  for (const part of payload.parts || []) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }
  for (const part of payload.parts || []) {
    const nested = extractBody(part);
    if (nested) return nested;
  }
  return '';
}

function parseEmailAddresses(headerValue) {
  const emailRegex = /[\w.-]+@[\w.-]+/g;
  const matches = headerValue.match(emailRegex) || [];
  return matches.map(email => ({ email, type: 'email' }));
}

module.exports = { GmailConnector };
