const { logger } = require('./logger');

const tables = new Map();
const objects = new Map();
const queues = new Map();

function getTable(name) {
  if (!tables.has(name)) tables.set(name, new Map());
  return tables.get(name);
}

function getQueue(url) {
  const key = url || 'default';
  if (!queues.has(key)) queues.set(key, []);
  return queues.get(key);
}

const dynamoClient = {
  async put(tableName, item) {
    const table = getTable(tableName);
    const pk = item.job_id || item.run_id || item.artifact_id || item.connector_name || item.audit_id;
    table.set(pk, { ...item });
    return {};
  },

  async get(tableName, key) {
    const table = getTable(tableName);
    const pk = Object.values(key)[0];
    return table.get(pk) || null;
  },

  async query(tableName, keyCondition, expressionValues, { indexName, limit, scanForward = true } = {}) {
    const table = getTable(tableName);
    const items = [...table.values()];
    const filterField = Object.keys(expressionValues)[0]?.replace(':', '');
    const filterValue = Object.values(expressionValues)[0];

    let filtered = items;
    if (filterField && filterValue) {
      filtered = items.filter(item => item[filterField] === filterValue);
    }

    if (!scanForward) filtered.reverse();
    if (limit) filtered = filtered.slice(0, limit);
    return filtered;
  },

  async update(tableName, key, updateExpression, expressionValues, expressionNames) {
    const table = getTable(tableName);
    const pk = Object.values(key)[0];
    let item = table.get(pk);
    if (!item) {
      item = { ...key };
      table.set(pk, item);
    }

    if (expressionValues) {
      for (const [exprKey, value] of Object.entries(expressionValues)) {
        const fieldName = exprKey.replace(':', '');
        const resolvedName = expressionNames?.[`#${fieldName}`] || fieldName;
        item[resolvedName] = value;
      }
    }

    table.set(pk, item);
    return item;
  },

  async scan(tableName, filterExpression, expressionValues) {
    const table = getTable(tableName);
    let items = [...table.values()];

    if (filterExpression && expressionValues) {
      const filterField = Object.keys(expressionValues)[0]?.replace(':', '');
      const filterValue = Object.values(expressionValues)[0];
      if (filterField && filterValue) {
        items = items.filter(item => item[filterField] === filterValue);
      }
    }

    return items;
  },
};

const s3Client = {
  async putObject(key, body, contentType = 'application/json') {
    objects.set(key, { body: typeof body === 'string' ? body : JSON.stringify(body), contentType });
    return {};
  },

  async getObject(key) {
    const obj = objects.get(key);
    if (!obj) throw new Error(`S3 object not found: ${key}`);
    return obj.body;
  },
};

const sqsClient = {
  async sendMessage(queueUrl, messageBody, attributes = {}) {
    const queue = getQueue(queueUrl);
    queue.push({
      MessageId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      Body: messageBody,
      ReceiptHandle: `receipt-${Date.now()}`,
      MessageAttributes: attributes,
    });
    return {};
  },

  async receiveMessages(queueUrl, maxMessages = 5, waitTimeSeconds = 0) {
    const queue = getQueue(queueUrl);
    const messages = queue.splice(0, maxMessages);
    return messages.map(msg => ({
      receiptHandle: msg.ReceiptHandle,
      body: msg.Body,
      attributes: msg.MessageAttributes || {},
    }));
  },

  async deleteMessage(queueUrl, receiptHandle) {
    return {};
  },
};

logger.info('local-store', 'Using in-memory local store (no AWS)');

module.exports = { dynamoClient, s3Client, sqsClient };
