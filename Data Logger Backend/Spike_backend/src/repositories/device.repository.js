import { dynamoTables } from '../config/aws.config.js';
import { createBaseRepository } from './base.repository.js';

/**
 * Expected table schema for `env.dynamodb.devicesTable` (must already
 * exist - this backend never issues CreateTableCommand):
 *
 *   Partition key: deviceId (String)
 *   GSI:           OwnerIndex (partition key: ownerId)
 *
 * Item shape:
 *   { deviceId, name, ownerId, firmwareVersion, lastSeenAt,
 *     createdAt, updatedAt }
 *
 * "Online/Offline" is NOT stored - it's derived at read time in
 * device.service.js from `lastSeenAt` vs a configurable threshold,
 * so there's nothing to keep in sync as heartbeats arrive.
 */

const OWNER_INDEX = 'OwnerIndex';
const repo = createBaseRepository(dynamoTables.devices);

export async function createDevice(device) {
  return repo.putItem(device, { preventOverwrite: true, overwriteKeyField: 'deviceId' });
}

export async function findDeviceById(deviceId) {
  return repo.getItem({ deviceId });
}

export async function findDevicesByOwner(ownerId, { limit = 20, cursor } = {}) {
  return repo.query({
    indexName: OWNER_INDEX,
    keyConditionExpression: 'ownerId = :ownerId',
    expressionAttributeValues: { ':ownerId': ownerId },
    limit,
    cursor,
  });
}

export async function listAllDevices({ limit = 20, cursor } = {}) {
  return repo.scan({ limit, cursor });
}

export async function updateDevice(deviceId, updates) {
  return repo.updateItem({ deviceId }, updates);
}

export async function deleteDevice(deviceId) {
  return repo.deleteItem({ deviceId });
}
