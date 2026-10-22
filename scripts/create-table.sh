#!/usr/bin/env bash
set -euo pipefail

TABLE_NAME="${DYNAMO_TABLE:-loadbearing-demo}"
REGION="${AWS_REGION:-us-east-1}"

echo "Creating DynamoDB table '${TABLE_NAME}' in region '${REGION}'..."

if aws dynamodb describe-table --table-name "${TABLE_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  echo "Table '${TABLE_NAME}' already exists."
else
  aws dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}"

  echo "Waiting for table '${TABLE_NAME}' to become ACTIVE..."
  aws dynamodb wait table-exists --table-name "${TABLE_NAME}" --region "${REGION}"

  echo "Enabling TTL on attribute 'ttl'..."
  aws dynamodb update-time-to-live \
    --table-name "${TABLE_NAME}" \
    --time-to-live-specification "Enabled=true, AttributeName=ttl" \
    --region "${REGION}"

  echo "Table '${TABLE_NAME}' created and configured successfully."
fi
