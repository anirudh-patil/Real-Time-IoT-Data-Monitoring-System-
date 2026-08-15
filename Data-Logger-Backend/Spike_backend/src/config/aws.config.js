import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from './env.config.js';

/**
 * IMPORTANT
 * This backend only ever READS FROM / WRITES ITEMS TO existing DynamoDB
 * tables that are already provisioned by the IoT ingestion pipeline
 * (STM32 -> ESP32 -> MQTT -> AWS IoT Core -> IoT Rule -> DynamoDB).
 *
 * This file must NEVER contain CreateTableCommand, DeleteTableCommand,
 * UpdateTableCommand, or any infrastructure-provisioning logic.
 * Table existence is assumed and validated externally (see health checks
 * in Module 14 - Logging & Monitoring).
 */

const dynamoClientConfig = {
  region: env.aws.region,
};

// Only pass explicit credentials if provided.
// In production this is expected to fall back to an IAM role
// (EC2 instance profile / ECS task role / Lambda execution role).
if (env.aws.accessKeyId && env.aws.secretAccessKey) {
  dynamoClientConfig.credentials = {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  };
}

const rawDynamoClient = new DynamoDBClient(dynamoClientConfig);

// Document client marshals/unmarshals JS types <-> DynamoDB attribute types
// automatically, so repositories can work with plain JS objects.
export const dynamoDocClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

export const dynamoTables = {
  telemetry: env.dynamodb.telemetryTable,
  users: env.dynamodb.usersTable,
  devices: env.dynamodb.devicesTable,
  alerts: env.dynamodb.alertsTable,
  refreshTokens: env.dynamodb.refreshTokensTable,
  activityLogs: env.dynamodb.activityLogsTable,
};

export default rawDynamoClient;
