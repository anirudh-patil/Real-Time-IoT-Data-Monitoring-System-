import { dynamoTables } from '../config/aws.config.js';
import { createBaseRepository } from './base.repository.js';

/**
 * Expected table schema for `env.dynamodb.activityLogsTable` (must already
 * exist - this backend never issues CreateTableCommand):
 *
 *   Partition key: userId (String)
 *   Sort key:      timestamp (String, ISO-8601)
 *
 * Item shape: { userId, timestamp, action, metadata, ip, userAgent }
 */

const repo = createBaseRepository(dynamoTables.activityLogs);

export async function logActivity({ userId, action, metadata = {}, ip, userAgent }) {
  const item = {
    userId,
    timestamp: new Date().toISOString(),
    action,
    metadata,
    ip: ip || null,
    userAgent: userAgent || null,
  };
  return repo.putItem(item);
}

export async function getActivityHistory(userId, { limit = 50 } = {}) {
  const { items } = await repo.query({
    keyConditionExpression: 'userId = :userId',
    expressionAttributeValues: { ':userId': userId },
    limit,
    scanIndexForward: false, // most recent first
  });
  return items;
}
