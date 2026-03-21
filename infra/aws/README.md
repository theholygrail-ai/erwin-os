# AWS infrastructure (Erwin OS)

Account context: **astro-invest** (`974560757141`). Use the same AWS CLI profile you use for that account.

## One-shot (Git Bash / WSL)

```bash
export AWS_REGION=us-east-1
bash infra/aws/setup.sh
```

Creates DynamoDB tables (`erwin-os-*`), S3 bucket `erwin-os-artifacts`, SQS job queue + DLQ, EventBridge rules, and SSM parameter placeholders.

## DynamoDB GSI JSON (CLI on Windows)

If `setup.sh` did not create `erwin-os-jobs` / `erwin-os-runs` / `erwin-os-artifacts` (JSON escaping), create them with:

```bash
cd infra/aws
aws dynamodb create-table --table-name erwin-os-jobs \
  --attribute-definitions AttributeName=job_id,AttributeType=S AttributeName=status,AttributeType=S AttributeName=created_at,AttributeType=S \
  --key-schema AttributeName=job_id,KeyType=HASH \
  --global-secondary-indexes file://ddb-jobs-gsi.json \
  --billing-mode PAY_PER_REQUEST --region us-east-1
# (same pattern for runs/artifacts — see ddb-*-gsi.json)
```

## IAM policy for Vercel API

- Policy document: [`iam-vercel-api-policy.json`](iam-vercel-api-policy.json)
- IAM user: `erwin-os-vercel-api` — attach policy `erwin-os-vercel-api-policy`, then create access keys for **Vercel** env vars only.

## Vercel env vars

After generating keys, set in Vercel **Production** (or run `push-vercel-env.ps1` with `infra/aws/vercel-aws.env` — file is gitignored):

- `AWS_REGION`, `AWS_ACCOUNT_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_ARTIFACTS_BUCKET`, `SQS_JOB_QUEUE_URL`, `SQS_DLQ_URL`
- `DYNAMODB_*_TABLE` for jobs, runs, artifacts, connectors, audit
- `NODE_ENV=production`

Redeploy the project after changing env vars.
