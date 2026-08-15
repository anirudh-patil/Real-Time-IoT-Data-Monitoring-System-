import { dynamoTables } from '../config/aws.config.js';
import { createBaseRepository } from './base.repository.js';

/**
 * Expected table schema for `env.dynamodb.alertsTable` (must already
 * exist - this backend never issues CreateTableCommand):
 *
 *   Partition key: alertId (String)
 *   GSI:           DeviceIdIndex (partition key: deviceId, sort key: createdAt)
 *
 * Item shape:
 *   { alertId, deviceId, type, severity, message, status, createdAt, resolvedAt }
 *   type:     HIGH_VOLTAGE | LOW_VOLTAGE | HIGH_CURRENT | HIGH_TEMPERATURE
 *             | DEVICE_OFFLINE | COMMUNICATION_TIMEOUT
 *   status:   'active' | 'resolved'
 */

const DEVICE_ID_INDEX = 'DeviceIdIndex';
const repo = createBaseRepository(dynamoTables.alerts);

export async function createAlert(alert) {
  return repo.putItem(alert);
}

export async function getAlertById(alertId) {
  return repo.getItem({ alertId });
}

export async function resolveAlert(alertId) {
  return repo.updateItem({ alertId }, { status: 'resolved', resolvedAt: new Date().toISOString() });
}

export async function findRecentAlertsForDevice(deviceId, { limit = 5, cursor, status } = {}) {
  // Status isn't part of the key, so it's filtered client-side in the
  // service layer when needed - the GSI is only sorted by createdAt.
  return repo.query({
    indexName: DEVICE_ID_INDEX,
    keyConditionExpression: 'deviceId = :deviceId',
    expressionAttributeValues: { ':deviceId': deviceId },
    limit,
    cursor,
    scanIndexForward: false, // most recent first
  });
}

/**
 * Finds the current active alert of a given type for a device, if any -
 * used to avoid spamming duplicate alerts while a condition persists, and
 * to know what to auto-resolve once the reading returns to normal.
 * Scans the most recent alerts for the device (bounded) rather than
 * requiring a dedicated type+status index - fine at this table's expected
 * alert volume per device.
 */
export async function findActiveAlertByType(deviceId, type) {
  const { items } = await findRecentAlertsForDevice(deviceId, { limit: 20 });
  return items.find((alert) => alert.type === type && alert.status === 'active') || null;
}
