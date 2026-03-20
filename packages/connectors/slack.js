const { SocketModeClient } = require('@slack/socket-mode');
const { WebClient } = require('@slack/web-api');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { SOURCE_SYSTEMS, normalizeEvent } = require('@erwin-os/schemas');
const { extractDocKeywords } = require('./clickup');

class SlackConnector {
  constructor() {
    this.name = 'slack';
    this.web = new WebClient(config.slack.botToken);
    this.socketMode = null;
    this.eventHandler = null;
  }

  async startListening(onEvent) {
    this.eventHandler = onEvent;
    this.socketMode = new SocketModeClient({ appToken: config.slack.appToken });

    this.socketMode.on('message', async ({ event, body, ack }) => {
      await ack();
      try {
        const normalized = this.normalizeEvent(event, body);
        if (this.eventHandler) await this.eventHandler(normalized);
      } catch (err) {
        logger.error('slack-connector', 'Failed to process event', { error: err.message });
      }
    });

    this.socketMode.on('app_mention', async ({ event, body, ack }) => {
      await ack();
      try {
        const normalized = this.normalizeEvent(event, body);
        normalized.is_mention = true;
        if (this.eventHandler) await this.eventHandler(normalized);
      } catch (err) {
        logger.error('slack-connector', 'Failed to process mention', { error: err.message });
      }
    });

    await this.socketMode.start();
    logger.info('slack-connector', 'Socket Mode connected');
  }

  async stopListening() {
    if (this.socketMode) {
      await this.socketMode.disconnect();
      logger.info('slack-connector', 'Socket Mode disconnected');
    }
  }

  normalizeEvent(event, body) {
    const normalized = normalizeEvent({
      sourceSystem: SOURCE_SYSTEMS.SLACK,
      rawEvent: { event, body },
    });

    normalized.event_id = event.client_msg_id || event.ts;
    normalized.title = `Slack message in #${event.channel}`;
    normalized.body = event.text || '';
    normalized.assignee = [];

    if (event.text) {
      const mentionMatch = event.text.match(/<@([A-Z0-9]+)>/g) || [];
      normalized.assignee = mentionMatch.map(m => ({
        id: m.replace(/<@|>/g, ''),
        type: 'slack_user',
      }));
    }

    normalized.linked_refs = [
      { type: 'slack_channel', id: event.channel },
      { type: 'slack_message', id: event.ts },
    ];

    if (event.thread_ts) {
      normalized.linked_refs.push({ type: 'slack_thread', id: event.thread_ts });
    }

    normalized.keywords = extractDocKeywords((normalized.body || '').toLowerCase());
    return normalized;
  }

  async searchMessages(query, count = 20) {
    const result = await this.web.search.messages({ query, count });
    return result.messages?.matches || [];
  }

  async getChannelHistory(channelId, limit = 50) {
    const result = await this.web.conversations.history({ channel: channelId, limit });
    return result.messages || [];
  }

  async getThreadReplies(channelId, threadTs) {
    const result = await this.web.conversations.replies({ channel: channelId, ts: threadTs });
    return result.messages || [];
  }

  async getUserInfo(userId) {
    const result = await this.web.users.info({ user: userId });
    return result.user;
  }

  async healthCheck() {
    try {
      await this.web.auth.test();
      return { status: 'healthy', connector: this.name };
    } catch (err) {
      return { status: 'unhealthy', connector: this.name, error: err.message };
    }
  }
}

module.exports = { SlackConnector };
