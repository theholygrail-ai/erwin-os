const { dynamoClient } = require('./aws-clients');
const { config } = require('./config');
const { logger } = require('./logger');
const { v4: uuidv4 } = require('uuid');

const AUDIT_TABLE = 'erwin-os-audit';

async function logAuditEvent({ actor, action, resource, resourceId, details, severity = 'info' }) {
  const entry = {
    audit_id: uuidv4(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    resource,
    resource_id: resourceId,
    details: typeof details === 'string' ? details : JSON.stringify(details),
    severity,
  };

  try {
    await dynamoClient.put(AUDIT_TABLE, entry);
  } catch (err) {
    logger.warn('audit', 'Failed to write audit log to DynamoDB, logging to stdout', {
      error: err.message,
    });
    logger.info('audit-fallback', `${actor}:${action}:${resource}`, entry);
  }

  return entry;
}

async function getAuditLogs({ limit = 100, actor, action, resource, startDate, endDate } = {}) {
  try {
    let items = await dynamoClient.scan(AUDIT_TABLE);

    if (actor) items = items.filter(i => i.actor === actor);
    if (action) items = items.filter(i => i.action === action);
    if (resource) items = items.filter(i => i.resource === resource);
    if (startDate) items = items.filter(i => i.timestamp >= startDate);
    if (endDate) items = items.filter(i => i.timestamp <= endDate);

    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return items.slice(0, limit);
  } catch (err) {
    logger.error('audit', 'Failed to read audit logs', { error: err.message });
    return [];
  }
}

module.exports = { logAuditEvent, getAuditLogs };
