import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, dynamoTables } from '../config/aws.config.js';
import { withDynamoErrors } from '../utils/dynamoError.util.js';

/**
 * READ-ONLY. This table is populated by the existing pipeline
 * (STM32 -> ESP32 -> MQTT -> AWS IoT Core -> IoT Rule -> DynamoDB) and is
 * never written to by this backend.
 *
 * ASSUMED schema for `env.dynamodb.telemetryTable` - confirm this matches
 * your actual IoT Rule's DynamoDB action before deploying. If it differs,
 * only this file needs to change:
 *
 *   Partition key: deviceId (String)
 *   Sort key:      timestamp (String, ISO-8601)
 *
 * Assumed item shape:
 *   { deviceId, timestamp, voltage, current, temperature, power }
 */

const TABLE = dynamoTables.telemetry;

export async function findLatestReading(deviceId) {
  return withDynamoErrors(async () => {
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'deviceId = :deviceId',
        ExpressionAttributeValues: { ':deviceId': deviceId },
        ScanIndexForward: false, // newest first
        Limit: 1,
      })
    );
    return result.Items?.[0] || null;
  });
}

/**
 * @param {object} options
 * @param {string} [options.startDate] - ISO-8601, inclusive
 * @param {string} [options.endDate] - ISO-8601, inclusive
 * @param {number} [options.limit]
 * @param {object} [options.cursor] - raw DynamoDB ExclusiveStartKey
 * @param {'asc'|'desc'} [options.sortOrder]
 * @param {object} [options.filters] - optional numeric range filters,
 *   e.g. { voltage: { min, max }, current: { min, max }, temperature: { min, max } }
 *   Applied as a DynamoDB FilterExpression - this filters the page AFTER
 *   the key-condition query, so a page can come back smaller than `limit`
 *   even when more matching items exist further on (client keeps paging).
 */
export async function findHistory(deviceId, options = {}) {
  const { startDate, endDate, limit = 50, cursor, sortOrder = 'desc', filters = {} } = options;

  let keyConditionExpression = 'deviceId = :deviceId';
  const expressionAttributeValues = { ':deviceId': deviceId };

  if (startDate && endDate) {
    keyConditionExpression += ' AND #ts BETWEEN :startDate AND :endDate';
    expressionAttributeValues[':startDate'] = startDate;
    expressionAttributeValues[':endDate'] = endDate;
  } else if (startDate) {
    keyConditionExpression += ' AND #ts >= :startDate';
    expressionAttributeValues[':startDate'] = startDate;
  } else if (endDate) {
    keyConditionExpression += ' AND #ts <= :endDate';
    expressionAttributeValues[':endDate'] = endDate;
  }

  const expressionAttributeNames = { '#ts': 'timestamp' };
  const filterParts = [];

  Object.entries(filters).forEach(([field, range]) => {
    if (!range) return;
    const fieldNameKey = `#${field}`;
    expressionAttributeNames[fieldNameKey] = field;

    if (range.min !== undefined) {
      const key = `:${field}Min`;
      filterParts.push(`${fieldNameKey} >= ${key}`);
      expressionAttributeValues[key] = range.min;
    }
    if (range.max !== undefined) {
      const key = `:${field}Max`;
      filterParts.push(`${fieldNameKey} <= ${key}`);
      expressionAttributeValues[key] = range.max;
    }
  });

  return withDynamoErrors(async () => {
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        FilterExpression: filterParts.length ? filterParts.join(' AND ') : undefined,
        Limit: limit,
        ExclusiveStartKey: cursor,
        ScanIndexForward: sortOrder === 'asc',
      })
    );
    return { items: result.Items || [], nextCursor: result.LastEvaluatedKey || null };
  });
}

/**
 * Fetches every reading in the window (following pagination internally, up
 * to `hardCap`) so statistics reflect the full range rather than one page.
 * For very large ranges/high-frequency devices, consider a pre-aggregated
 * rollup instead - that's what the Dashboard module's daily/weekly/monthly
 * stats will use rather than raw scans like this.
 */
export async function findAllForRange(deviceId, { startDate, endDate, hardCap = 5000 } = {}) {
  const items = [];
  let cursor;

  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await findHistory(deviceId, { startDate, endDate, limit: 1000, cursor, sortOrder: 'asc' });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && items.length < hardCap);

  return items;
}
