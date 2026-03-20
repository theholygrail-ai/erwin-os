const { config } = require('./config');

const isLocalDev = config.server.nodeEnv === 'development' && !process.env.AWS_ACCESS_KEY_ID && !config.aws.accountId;

let dynamoClient, s3Client, sqsClient;

if (isLocalDev) {
  const local = require('./local-store');
  dynamoClient = local.dynamoClient;
  s3Client = local.s3Client;
  sqsClient = local.sqsClient;
} else {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    UpdateCommand,
    ScanCommand,
  } = require('@aws-sdk/lib-dynamodb');
  const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

  const ddbClient = new DynamoDBClient({ region: config.aws.region });
  const docClient = DynamoDBDocumentClient.from(ddbClient);
  const s3 = new S3Client({ region: config.aws.region });
  const sqs = new SQSClient({ region: config.aws.region });

  dynamoClient = {
    async put(tableName, item) {
      return docClient.send(new PutCommand({ TableName: tableName, Item: item }));
    },

    async get(tableName, key) {
      const result = await docClient.send(new GetCommand({ TableName: tableName, Key: key }));
      return result.Item || null;
    },

    async query(tableName, keyCondition, expressionValues, { indexName, limit, scanForward = true } = {}) {
      const params = {
        TableName: tableName,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues,
        ScanIndexForward: scanForward,
      };
      if (indexName) params.IndexName = indexName;
      if (limit) params.Limit = limit;
      const result = await docClient.send(new QueryCommand(params));
      return result.Items || [];
    },

    async update(tableName, key, updateExpression, expressionValues, expressionNames) {
      const params = {
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW',
      };
      if (expressionNames) params.ExpressionAttributeNames = expressionNames;
      const result = await docClient.send(new UpdateCommand(params));
      return result.Attributes;
    },

    async scan(tableName, filterExpression, expressionValues) {
      const params = { TableName: tableName };
      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionValues;
      }
      const result = await docClient.send(new ScanCommand(params));
      return result.Items || [];
    },
  };

  s3Client = {
    async putObject(key, body, contentType = 'application/json') {
      return s3.send(new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
        Body: typeof body === 'string' ? body : JSON.stringify(body),
        ContentType: contentType,
      }));
    },

    async getObject(key) {
      const result = await s3.send(new GetObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      }));
      return result.Body.transformToString();
    },
  };

  sqsClient = {
    async sendMessage(queueUrl, messageBody, attributes = {}) {
      return sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl || config.aws.sqsJobQueueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: Object.fromEntries(
          Object.entries(attributes).map(([k, v]) => [k, { DataType: 'String', StringValue: String(v) }])
        ),
      }));
    },

    async receiveMessages(queueUrl, maxMessages = 5, waitTimeSeconds = 10) {
      const result = await sqs.send(new ReceiveMessageCommand({
        QueueUrl: queueUrl || config.aws.sqsJobQueueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: waitTimeSeconds,
        MessageAttributeNames: ['All'],
      }));
      return (result.Messages || []).map(msg => ({
        receiptHandle: msg.ReceiptHandle,
        body: JSON.parse(msg.Body),
        attributes: msg.MessageAttributes || {},
      }));
    },

    async deleteMessage(queueUrl, receiptHandle) {
      return sqs.send(new DeleteMessageCommand({
        QueueUrl: queueUrl || config.aws.sqsJobQueueUrl,
        ReceiptHandle: receiptHandle,
      }));
    },
  };
}

module.exports = { dynamoClient, s3Client, sqsClient };
