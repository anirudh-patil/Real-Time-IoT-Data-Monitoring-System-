import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.config.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import rawDynamoClient from '../config/aws.config.js';

/**
 * Full health check as required by spec section 14: server, AWS, and
 * DynamoDB. This was a bare liveness check until now (see Module 1's
 * README note) - AWS/DynamoDB connectivity needed the config the later
 * modules built out.
 *
 * ListTablesCommand is used as the connectivity probe rather than reading
 * a specific table: it's a cheap, side-effect-free call that verifies
 * both that AWS credentials resolve AND that DynamoDB is reachable,
 * without depending on any one table's data existing yet.
 */
async function checkDynamoDb() {
  const startedAt = Date.now();
  try {
    await rawDynamoClient.send(new ListTablesCommand({ Limit: 1 }));
    return { status: 'ok', latencyMs: Date.now() - startedAt };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

export async function getHealth(req, res) {
  const dynamodb = await checkDynamoDb();
  const isHealthy = dynamodb.status === 'ok';

  return sendSuccess(res, {
    statusCode: isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE,
    message: isHealthy ? 'Service is healthy' : 'Service is degraded',
    data: {
      status: isHealthy ? 'ok' : 'degraded',
      environment: env.nodeEnv,
      apiVersion: env.apiVersion,
      server: { status: 'ok', uptimeSeconds: process.uptime() },
      aws: { region: env.aws.region, status: dynamodb.status },
      dynamodb,
    },
  });
}
