#Requires -Version 5.1
<#
  Provisions Erwin OS AWS resources (DynamoDB, S3, SQS) and an IAM user for the Vercel API.
  Run from repo root:  pwsh -File infra/aws/deploy-aws.ps1
  Requires: aws CLI v2, authenticated (e.g. astro-invest-admin).
#>
# AWS CLI writes to stderr; do not treat as terminating errors
$ErrorActionPreference = "Continue"

$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$Stack = if ($env:ERWIN_OS_STACK_NAME) { $env:ERWIN_OS_STACK_NAME } else { "erwin-os" }
$Account = (aws sts get-caller-identity --query Account --output text).Trim()
$Bucket = "${Stack}-artifacts-${Account}"

Write-Host "=== Erwin OS AWS deploy ===" -ForegroundColor Cyan
Write-Host "Region: $Region  Account: $Account  Bucket: $Bucket"

# --- DynamoDB: jobs ---
aws dynamodb describe-table --table-name "${Stack}-jobs" --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws dynamodb create-table `
    --table-name "${Stack}-jobs" `
    --attribute-definitions `
      AttributeName=job_id,AttributeType=S `
      AttributeName=status,AttributeType=S `
      AttributeName=created_at,AttributeType=S `
    --key-schema AttributeName=job_id,KeyType=HASH `
    --global-secondary-indexes "[{\"IndexName\":\"status-created-index\",\"KeySchema\":[{\"AttributeName\":\"status\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
    --billing-mode PAY_PER_REQUEST `
    --region $Region | Out-Null
  Write-Host "  Created ${Stack}-jobs"
} else { Write-Host "  [exists] ${Stack}-jobs" }

# --- DynamoDB: runs ---
aws dynamodb describe-table --table-name "${Stack}-runs" --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws dynamodb create-table `
    --table-name "${Stack}-runs" `
    --attribute-definitions `
      AttributeName=run_id,AttributeType=S `
      AttributeName=job_id,AttributeType=S `
    --key-schema AttributeName=run_id,KeyType=HASH `
    --global-secondary-indexes "[{\"IndexName\":\"job-index\",\"KeySchema\":[{\"AttributeName\":\"job_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
    --billing-mode PAY_PER_REQUEST `
    --region $Region | Out-Null
  Write-Host "  Created ${Stack}-runs"
} else { Write-Host "  [exists] ${Stack}-runs" }

# --- DynamoDB: artifacts ---
aws dynamodb describe-table --table-name "${Stack}-artifacts" --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws dynamodb create-table `
    --table-name "${Stack}-artifacts" `
    --attribute-definitions `
      AttributeName=artifact_id,AttributeType=S `
      AttributeName=job_id,AttributeType=S `
    --key-schema AttributeName=artifact_id,KeyType=HASH `
    --global-secondary-indexes "[{\"IndexName\":\"job-index\",\"KeySchema\":[{\"AttributeName\":\"job_id\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" `
    --billing-mode PAY_PER_REQUEST `
    --region $Region | Out-Null
  Write-Host "  Created ${Stack}-artifacts"
} else { Write-Host "  [exists] ${Stack}-artifacts" }

# --- DynamoDB: connectors ---
aws dynamodb describe-table --table-name "${Stack}-connectors" --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws dynamodb create-table `
    --table-name "${Stack}-connectors" `
    --attribute-definitions AttributeName=connector_name,AttributeType=S `
    --key-schema AttributeName=connector_name,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $Region | Out-Null
  Write-Host "  Created ${Stack}-connectors"
} else { Write-Host "  [exists] ${Stack}-connectors" }

# --- DynamoDB: audit ---
aws dynamodb describe-table --table-name "${Stack}-audit" --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws dynamodb create-table `
    --table-name "${Stack}-audit" `
    --attribute-definitions AttributeName=audit_id,AttributeType=S `
    --key-schema AttributeName=audit_id,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $Region | Out-Null
  Write-Host "  Created ${Stack}-audit"
} else { Write-Host "  [exists] ${Stack}-audit" }

# --- S3 ---
aws s3api head-bucket --bucket $Bucket --region $Region 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $Bucket --region $Region | Out-Null
  } else {
    aws s3api create-bucket --bucket $Bucket --region $Region --create-bucket-configuration LocationConstraint=$Region | Out-Null
  }
  Write-Host "  Created S3 bucket $Bucket"
} else { Write-Host "  [exists] S3 $Bucket" }

# --- SQS DLQ + main queue ---
$DlqUrl = aws sqs get-queue-url --queue-name "${Stack}-jobs-dlq" --region $Region --query QueueUrl --output text 2>$null
if (-not $DlqUrl -or $DlqUrl -eq "None") {
  $DlqUrl = aws sqs create-queue --queue-name "${Stack}-jobs-dlq" --attributes MessageRetentionPeriod=1209600 --region $Region --query QueueUrl --output text
  Write-Host "  Created DLQ $DlqUrl"
} else { Write-Host "  [exists] DLQ $DlqUrl" }

$DlqArn = aws sqs get-queue-attributes --queue-url $DlqUrl --attribute-names QueueArn --region $Region --query Attributes.QueueArn --output text
$JobQueueUrl = aws sqs get-queue-url --queue-name "${Stack}-jobs" --region $Region --query QueueUrl --output text 2>$null
if (-not $JobQueueUrl -or $JobQueueUrl -eq "None") {
  $rp = '{"deadLetterTargetArn":"' + $DlqArn + '","maxReceiveCount":"3"}'
  $rpEsc = $rp.Replace('"', '\"')
  $attrs = "{`"VisibilityTimeout`":`"900`",`"MessageRetentionPeriod`":`"604800`",`"RedrivePolicy`":`"$rpEsc`"}"
  $JobQueueUrl = aws sqs create-queue --queue-name "${Stack}-jobs" --attributes $attrs --region $Region --query QueueUrl --output text
  Write-Host "  Created job queue $JobQueueUrl"
} else { Write-Host "  [exists] Job queue $JobQueueUrl" }

# --- IAM policy for Vercel API user ---
$PolicyName = "${Stack}-vercel-api-policy"
$PolicyDoc = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBTables",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem","dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:DeleteItem",
        "dynamodb:Query","dynamodb:Scan","dynamodb:BatchGetItem","dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-jobs",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-jobs/index/*",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-runs",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-runs/index/*",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-artifacts",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-artifacts/index/*",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-connectors",
        "arn:aws:dynamodb:${Region}:${Account}:table/${Stack}-audit"
      ]
    },
    {
      "Sid": "S3Artifacts",
      "Effect": "Allow",
      "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${Bucket}",
        "arn:aws:s3:::${Bucket}/*"
      ]
    },
    {
      "Sid": "SQSJobQueue",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage","sqs:ReceiveMessage","sqs:DeleteMessage",
        "sqs:GetQueueAttributes","sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:${Region}:${Account}:${Stack}-jobs",
        "arn:aws:sqs:${Region}:${Account}:${Stack}-jobs-dlq"
      ]
    }
  ]
}
"@

$PolicyFile = Join-Path $env:TEMP "erwin-os-policy.json"
$PolicyDoc | Out-File -FilePath $PolicyFile -Encoding utf8
$PolicyFileUri = $PolicyFile -replace '\\','/'
$PolicyArn = (aws iam list-policies --scope Local --query "Policies[?PolicyName=='$PolicyName'].Arn" --output text).Trim()
if (-not $PolicyArn) {
  $PolicyArn = (aws iam create-policy --policy-name $PolicyName --policy-document "file://$PolicyFileUri" --query Policy.Arn --output text).Trim()
  Write-Host "  Created IAM policy $PolicyName"
} else {
  aws iam create-policy-version --policy-arn $PolicyArn --policy-document "file://$PolicyFileUri" --set-as-default | Out-Null
  Write-Host "  Updated IAM policy $PolicyName"
}

$IamUser = "${Stack}-vercel-api"
aws iam get-user --user-name $IamUser 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  aws iam create-user --user-name $IamUser | Out-Null
  Write-Host "  Created IAM user $IamUser"
} else { Write-Host "  [exists] IAM user $IamUser" }

aws iam attach-user-policy --user-name $IamUser --policy-arn $PolicyArn 2>&1 | Out-Null

# Access key (creates new if user has fewer than 2 keys)
$KeysArr = aws iam list-access-keys --user-name $IamUser --query AccessKeyMetadata --output json | ConvertFrom-Json
$KeyCount = @($KeysArr).Count
if ($KeyCount -ge 2) {
  Write-Warning "IAM user $IamUser already has $KeyCount access keys. Delete one in console or use existing keys; skipping new key creation."
  $AccessKeyId = ""
  $SecretAccessKey = ""
} else {
  $KeyOut = aws iam create-access-key --user-name $IamUser --output json | ConvertFrom-Json
  $AccessKeyId = $KeyOut.AccessKey.AccessKeyId
  $SecretAccessKey = $KeyOut.AccessKey.SecretAccessKey
  Write-Host "  Created new access key for $IamUser" -ForegroundColor Green
}

$Out = [ordered]@{
  AWS_REGION = $Region
  AWS_ACCOUNT_ID = $Account
  S3_ARTIFACTS_BUCKET = $Bucket
  SQS_JOB_QUEUE_URL = $JobQueueUrl
  SQS_DLQ_URL = $DlqUrl
  DYNAMODB_JOBS_TABLE = "${Stack}-jobs"
  DYNAMODB_RUNS_TABLE = "${Stack}-runs"
  DYNAMODB_ARTIFACTS_TABLE = "${Stack}-artifacts"
  DYNAMODB_CONNECTORS_TABLE = "${Stack}-connectors"
  DYNAMODB_AUDIT_TABLE = "${Stack}-audit"
}
if ($AccessKeyId) {
  $Out.AWS_ACCESS_KEY_ID = $AccessKeyId
  $Out.AWS_SECRET_ACCESS_KEY = $SecretAccessKey
}

$OutPath = Join-Path (Get-Location) "infra\aws\vercel-aws.env"
$lines = @()
foreach ($k in $Out.Keys) {
  $lines += "$k=$($Out[$k])"
}
$lines | Set-Content -Path $OutPath -Encoding utf8
Write-Host "`nWrote $OutPath (gitignored pattern: vercel-aws.env)" -ForegroundColor Yellow
Write-Host "`nSet these in Vercel (Settings > Environment Variables) or run: pwsh infra/aws/push-vercel-env.ps1`n"
