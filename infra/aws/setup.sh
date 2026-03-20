#!/bin/bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK="erwin-os"
echo "=== Erwin OS AWS Infrastructure Setup ==="
echo "Region: $REGION"

echo ""
echo "--- DynamoDB Tables ---"

aws dynamodb create-table \
  --table-name "${STACK}-jobs" \
  --attribute-definitions \
    AttributeDefinition=AttributeName=job_id,AttributeType=S \
    AttributeDefinition=AttributeName=status,AttributeType=S \
    AttributeDefinition=AttributeName=created_at,AttributeType=S \
  --key-schema \
    AttributeElement=AttributeName=job_id,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"status-created-index\",\"KeySchema\":[{\"AttributeName\":\"status\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null && echo "Created ${STACK}-jobs table" || echo "${STACK}-jobs table already exists"

aws dynamodb create-table \
  --table-name "${STACK}-runs" \
  --attribute-definitions \
    AttributeDefinition=AttributeName=run_id,AttributeType=S \
    AttributeDefinition=AttributeName=job_id,AttributeType=S \
  --key-schema \
    AttributeElement=AttributeName=run_id,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"job-index\",\"KeySchema\":[{\"AttributeName\":\"job_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null && echo "Created ${STACK}-runs table" || echo "${STACK}-runs table already exists"

aws dynamodb create-table \
  --table-name "${STACK}-artifacts" \
  --attribute-definitions \
    AttributeDefinition=AttributeName=artifact_id,AttributeType=S \
    AttributeDefinition=AttributeName=job_id,AttributeType=S \
  --key-schema \
    AttributeElement=AttributeName=artifact_id,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"job-index\",\"KeySchema\":[{\"AttributeName\":\"job_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null && echo "Created ${STACK}-artifacts table" || echo "${STACK}-artifacts table already exists"

aws dynamodb create-table \
  --table-name "${STACK}-connectors" \
  --attribute-definitions \
    AttributeDefinition=AttributeName=connector_name,AttributeType=S \
  --key-schema \
    AttributeElement=AttributeName=connector_name,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" 2>/dev/null && echo "Created ${STACK}-connectors table" || echo "${STACK}-connectors table already exists"

echo ""
echo "--- S3 Bucket ---"

aws s3 mb "s3://${STACK}-artifacts" --region "$REGION" 2>/dev/null && echo "Created S3 bucket" || echo "S3 bucket already exists"

aws s3api put-bucket-lifecycle-configuration \
  --bucket "${STACK}-artifacts" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "ExpireOldLogs",
      "Filter": {"Prefix": "logs/"},
      "Status": "Enabled",
      "Expiration": {"Days": 90}
    }]
  }' --region "$REGION" 2>/dev/null || true

echo ""
echo "--- SQS Queues ---"

DLQ_URL=$(aws sqs create-queue \
  --queue-name "${STACK}-jobs-dlq" \
  --attributes '{"MessageRetentionPeriod":"1209600"}' \
  --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null)
echo "DLQ: $DLQ_URL"

DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query 'Attributes.QueueArn' --output text)

JOB_QUEUE_URL=$(aws sqs create-queue \
  --queue-name "${STACK}-jobs" \
  --attributes "{\"VisibilityTimeout\":\"900\",\"MessageRetentionPeriod\":\"604800\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
  --region "$REGION" \
  --query 'QueueUrl' --output text 2>/dev/null)
echo "Job Queue: $JOB_QUEUE_URL"

echo ""
echo "--- SSM Parameters (placeholders) ---"

aws ssm put-parameter \
  --name "/${STACK}/groq-api-key" \
  --type SecureString \
  --value "REPLACE_ME" \
  --overwrite \
  --region "$REGION" 2>/dev/null && echo "Created Groq API key parameter" || true

aws ssm put-parameter \
  --name "/${STACK}/nova-act-api-key" \
  --type SecureString \
  --value "REPLACE_ME" \
  --overwrite \
  --region "$REGION" 2>/dev/null && echo "Created Nova Act API key parameter" || true

echo ""
echo "--- EventBridge Rules ---"

aws events put-rule \
  --name "${STACK}-morning-standup" \
  --schedule-expression "cron(0 5 * * ? *)" \
  --state ENABLED \
  --description "Erwin OS morning standup trigger (05:00 UTC)" \
  --region "$REGION" 2>/dev/null && echo "Created morning standup rule" || true

aws events put-rule \
  --name "${STACK}-gmail-watch-renewal" \
  --schedule-expression "rate(6 days)" \
  --state ENABLED \
  --description "Renew Gmail watch before 7-day expiry" \
  --region "$REGION" 2>/dev/null && echo "Created Gmail watch renewal rule" || true

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Update /${STACK}/groq-api-key with your real Groq API key"
echo "  2. Update /${STACK}/nova-act-api-key with your Nova Act API key"
echo "  3. Note down these values for .env:"
echo "     SQS_JOB_QUEUE_URL=$JOB_QUEUE_URL"
echo "     SQS_DLQ_URL=$DLQ_URL"
