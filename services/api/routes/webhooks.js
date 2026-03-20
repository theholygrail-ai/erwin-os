const { Router } = require('express');
const { dynamoClient, sqsClient } = require('@erwin-os/shared/aws-clients');
const { config } = require('@erwin-os/shared/config');
const { logger } = require('@erwin-os/shared/logger');
const { createJob, JOB_STATUSES, PRIORITIES } = require('@erwin-os/schemas');
const { v4: uuidv4 } = require('uuid');

let _ClickUpConnector, _GmailConnector, _GoogleDriveConnector, _classifyEvent;
function getClickUp() { if (!_ClickUpConnector) _ClickUpConnector = require('@erwin-os/connectors/clickup').ClickUpConnector; return _ClickUpConnector; }
function getGmail() { if (!_GmailConnector) _GmailConnector = require('@erwin-os/connectors/gmail').GmailConnector; return _GmailConnector; }
function getDrive() { if (!_GoogleDriveConnector) _GoogleDriveConnector = require('@erwin-os/connectors/google-drive').GoogleDriveConnector; return _GoogleDriveConnector; }
function getClassifier() { if (!_classifyEvent) _classifyEvent = require('@erwin-os/classifier').classifyEvent; return _classifyEvent; }

const router = Router();

router.post('/clickup', async (req, res) => {
  try {
    const connector = new (getClickUp())(null);
    const signature = req.headers['x-signature'];

    if (signature && !connector.verifyWebhookSignature(req.body.toString(), signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = req.body;
    const normalized = connector.normalizeWebhookEvent(payload);
    await processNormalizedEvent(normalized, req.app);

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('webhook-clickup', 'Failed to process', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/gmail-pubsub', async (req, res) => {
  try {
    const pubsubMessage = req.body?.message;
    if (!pubsubMessage) return res.status(400).json({ error: 'No Pub/Sub message' });

    const connector = new (getGmail())();
    const events = await connector.processNotification(pubsubMessage);

    for (const event of events) {
      await processNormalizedEvent(event, req.app);
    }

    res.status(200).json({ processed: events.length });
  } catch (err) {
    logger.error('webhook-gmail', 'Failed to process', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/google-drive', async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    if (resourceState === 'sync') {
      return res.status(200).json({ sync: true });
    }

    const connector = new (getDrive())();
    const { events } = await connector.processChanges();

    for (const event of events) {
      await processNormalizedEvent(event, req.app);
    }

    res.status(200).json({ processed: events.length });
  } catch (err) {
    logger.error('webhook-drive', 'Failed to process', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

async function processNormalizedEvent(event, app) {
  const classification = getClassifier()(event);

  logger.info('webhooks', 'Event classified', {
    source: event.source_system,
    eventId: event.event_id,
    score: classification.score,
    action: classification.action,
  });

  if (classification.action === 'ignore') return;

  const job = createJob({
    jobId: uuidv4(),
    sourceSystem: event.source_system,
    sourceRef: event.linked_refs,
    assignedTo: config.erwin.displayName,
    documentType: classification.documentType,
    priority: classification.score >= 80 ? PRIORITIES.HIGH : PRIORITIES.MEDIUM,
    confidenceScore: classification.score,
    title: event.title || 'Untitled task',
    description: event.body?.substring(0, 2000) || '',
  });

  if (classification.action === 'needs_review') {
    job.status = JOB_STATUSES.NEW;
  }

  await dynamoClient.put(config.aws.tables.jobs, job);

  if (classification.action === 'auto_create') {
    await sqsClient.sendMessage(config.aws.sqsJobQueueUrl, { job_id: job.job_id });
  }

  if (app.locals.broadcastEvent) {
    app.locals.broadcastEvent({
      type: 'job_created',
      job: { job_id: job.job_id, title: job.title, status: job.status, priority: job.priority },
    });
  }
}

module.exports = router;
