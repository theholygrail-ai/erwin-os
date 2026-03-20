const crypto = require('crypto');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { SOURCE_SYSTEMS, normalizeEvent } = require('@erwin-os/schemas');

const CLICKUP_API = 'https://api.clickup.com/api/v2';

class ClickUpConnector {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.name = 'clickup';
  }

  headers() {
    return {
      Authorization: this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async apiCall(path, method = 'GET', body = null) {
    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${CLICKUP_API}${path}`, opts);
    if (!res.ok) throw new Error(`ClickUp API ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async getTask(taskId) {
    return this.apiCall(`/task/${taskId}`);
  }

  async getTaskComments(taskId) {
    return this.apiCall(`/task/${taskId}/comment`);
  }

  async searchTasks(teamId, query) {
    return this.apiCall(`/team/${teamId}/task?query=${encodeURIComponent(query)}`);
  }

  async getAssignedTasks(teamId, assigneeId) {
    return this.apiCall(`/team/${teamId}/task?assignees[]=${assigneeId}&subtasks=true&include_closed=false`);
  }

  async createWebhook(teamId, endpoint, events) {
    return this.apiCall(`/team/${teamId}/webhook`, 'POST', { endpoint, events });
  }

  verifyWebhookSignature(rawBody, signature) {
    if (!config.clickup.webhookSecret) return true;
    const expected = crypto
      .createHmac('sha256', config.clickup.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  normalizeWebhookEvent(payload) {
    const event = normalizeEvent({
      sourceSystem: SOURCE_SYSTEMS.CLICKUP,
      rawEvent: payload,
    });

    const taskData = payload.task || payload.history_items?.[0]?.after || {};
    event.event_id = payload.webhook_id || payload.event;
    event.title = taskData.name || payload.task_id || '';
    event.assignee = taskData.assignees?.map(a => ({
      id: a.id?.toString(),
      username: a.username,
      email: a.email,
    })) || [];
    event.body = taskData.description || taskData.text_content || '';
    event.linked_refs = [{ type: 'clickup_task', id: payload.task_id }];

    const text = `${event.title} ${event.body}`.toLowerCase();
    event.keywords = extractDocKeywords(text);

    return event;
  }

  static getOAuthUrl() {
    return `https://app.clickup.com/api?client_id=${config.clickup.clientId}&redirect_uri=${encodeURIComponent(config.clickup.redirectUri)}`;
  }

  static async exchangeCode(code) {
    const res = await fetch('https://app.clickup.com/api/v2/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clickup.clientId,
        client_secret: config.clickup.clientSecret,
        code,
      }),
    });
    if (!res.ok) throw new Error(`ClickUp OAuth error: ${await res.text()}`);
    return res.json();
  }

  async healthCheck() {
    try {
      await this.apiCall('/user');
      return { status: 'healthy', connector: this.name };
    } catch (err) {
      return { status: 'unhealthy', connector: this.name, error: err.message };
    }
  }
}

function extractDocKeywords(text) {
  const DOC_KEYWORDS = [
    'sop', 'workflow', 'prd', 'technical spec', 'architecture',
    'qa', 'uat', 'release', 'integration', 'process', 'api',
    'documentation', 'document', 'doc', 'writeup', 'write-up',
    'user guide', 'implementation', 'handover', 'summary', 'notes',
  ];
  return DOC_KEYWORDS.filter(kw => text.includes(kw));
}

module.exports = { ClickUpConnector, extractDocKeywords };
