const { google } = require('googleapis');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { SOURCE_SYSTEMS, normalizeEvent } = require('@erwin-os/schemas');
const { extractDocKeywords } = require('./clickup');

class GoogleDriveConnector {
  constructor(tokens) {
    this.name = 'google_drive';
    this.oauth2 = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    if (tokens) this.oauth2.setCredentials(tokens);
    this.drive = google.drive({ version: 'v3', auth: this.oauth2 });
    this.savedStartPageToken = null;
  }

  async setupWatch(webhookUrl, channelId) {
    const startPageToken = await this.getStartPageToken();
    const res = await this.drive.changes.watch({
      pageToken: startPageToken,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });
    logger.info('drive-connector', 'Watch setup', { resourceId: res.data.resourceId });
    return res.data;
  }

  async getStartPageToken() {
    const res = await this.drive.changes.getStartPageToken({});
    this.savedStartPageToken = res.data.startPageToken;
    return this.savedStartPageToken;
  }

  async processChanges(pageToken) {
    const token = pageToken || this.savedStartPageToken;
    if (!token) {
      logger.warn('drive-connector', 'No page token available');
      return { events: [], newPageToken: null };
    }

    const res = await this.drive.changes.list({
      pageToken: token,
      fields: 'nextPageToken,newStartPageToken,changes(fileId,file(id,name,mimeType,modifiedTime,lastModifyingUser,parents))',
    });

    this.savedStartPageToken = res.data.newStartPageToken || res.data.nextPageToken;

    const events = (res.data.changes || []).map(change => this.normalizeChange(change));
    return { events, newPageToken: this.savedStartPageToken };
  }

  normalizeChange(change) {
    const file = change.file || {};
    const normalized = normalizeEvent({
      sourceSystem: SOURCE_SYSTEMS.GOOGLE_DRIVE,
      rawEvent: change,
    });

    normalized.event_id = change.fileId;
    normalized.title = file.name || '';
    normalized.body = '';
    normalized.assignee = file.lastModifyingUser
      ? [{ email: file.lastModifyingUser.emailAddress, displayName: file.lastModifyingUser.displayName }]
      : [];
    normalized.linked_refs = [
      { type: 'drive_file', id: file.id, name: file.name, mimeType: file.mimeType },
    ];
    if (file.parents) {
      file.parents.forEach(parentId => {
        normalized.linked_refs.push({ type: 'drive_folder', id: parentId });
      });
    }

    normalized.keywords = extractDocKeywords((file.name || '').toLowerCase());
    return normalized;
  }

  async getFile(fileId) {
    const res = await this.drive.files.get({
      fileId,
      fields: 'id,name,mimeType,description,modifiedTime,lastModifyingUser,parents,webViewLink',
    });
    return res.data;
  }

  async getFileContent(fileId) {
    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    return res.data;
  }

  async exportGoogleDoc(fileId, mimeType = 'text/plain') {
    const res = await this.drive.files.export(
      { fileId, mimeType },
      { responseType: 'text' }
    );
    return res.data;
  }

  async searchFiles(query, maxResults = 20) {
    const res = await this.drive.files.list({
      q: query,
      pageSize: maxResults,
      fields: 'files(id,name,mimeType,modifiedTime,lastModifyingUser,parents,webViewLink)',
    });
    return res.data.files || [];
  }

  async healthCheck() {
    try {
      await this.drive.about.get({ fields: 'user' });
      return { status: 'healthy', connector: this.name };
    } catch (err) {
      return { status: 'unhealthy', connector: this.name, error: err.message };
    }
  }
}

module.exports = { GoogleDriveConnector };
