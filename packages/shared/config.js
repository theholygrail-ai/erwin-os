require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accountId: process.env.AWS_ACCOUNT_ID,
    s3Bucket: process.env.S3_ARTIFACTS_BUCKET || 'erwin-os-artifacts',
    sqsJobQueueUrl: process.env.SQS_JOB_QUEUE_URL,
    sqsDlqUrl: process.env.SQS_DLQ_URL,
    tables: {
      jobs: process.env.DYNAMODB_JOBS_TABLE || 'erwin-os-jobs',
      runs: process.env.DYNAMODB_RUNS_TABLE || 'erwin-os-runs',
      artifacts: process.env.DYNAMODB_ARTIFACTS_TABLE || 'erwin-os-artifacts',
      connectors: process.env.DYNAMODB_CONNECTORS_TABLE || 'erwin-os-connectors',
    },
  },
  clickup: {
    clientId: process.env.CLICKUP_CLIENT_ID,
    clientSecret: process.env.CLICKUP_CLIENT_SECRET,
    webhookSecret: process.env.CLICKUP_WEBHOOK_SECRET,
    redirectUri: process.env.CLICKUP_REDIRECT_URI,
    teamId: process.env.CLICKUP_TEAM_ID,
  },
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    pubsubTopic: process.env.GOOGLE_PUBSUB_TOPIC,
    pubsubSubscription: process.env.GOOGLE_PUBSUB_SUBSCRIPTION,
  },
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    recipientNumber: process.env.WHATSAPP_RECIPIENT_NUMBER,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  novaAct: {
    apiKey: process.env.NOVA_ACT_API_KEY,
    dailyBudget: parseFloat(process.env.NOVA_ACT_DAILY_BUDGET || '10.00'),
  },
  server: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    host: process.env.API_HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  erwin: {
    clickupUserId: process.env.ERWIN_CLICKUP_USER_ID,
    email: process.env.ERWIN_EMAIL || 'erwin.mothoa@ecomplete.co.za',
    slackUserId: process.env.ERWIN_SLACK_USER_ID,
    displayName: process.env.ERWIN_DISPLAY_NAME || 'Erwin Mothoa',
  },
};

module.exports = { config };
