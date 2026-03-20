const { config } = require('./config');
const { logger } = require('./logger');
const { groqClient } = require('./groq-client');
const { dynamoClient, s3Client, sqsClient } = require('./aws-clients');
const { apiClient } = require('./api-client');

module.exports = {
  config,
  logger,
  groqClient,
  dynamoClient,
  s3Client,
  sqsClient,
  apiClient,
};
