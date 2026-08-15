import { randomUUID } from 'crypto';
import {
  createDevice as createDeviceRecord,
  findDeviceById,
  findDevicesByOwner,
  listAllDevices,
  updateDevice as updateDeviceRecord,
  deleteDevice as deleteDeviceRecord,
} from '../repositories/device.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ROLES } from '../constants/roles.js';
import { env } from '../config/env.config.js';

const MANAGER_ROLES = [ROLES.ADMIN, ROLES.ENGINEER];

function isManager(requester) {
  return MANAGER_ROLES.includes(requester.role);
}

function isOwner(device, requester) {
  return device.ownerId === requester.userId;
}

function assertCanView(device, requester) {
  if (isManager(requester) || isOwner(device, requester)) return;
  throw new AppError('You do not have access to this device', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
}

function assertCanManage(device, requester) {
  if (isManager(requester) || isOwner(device, requester)) return;
  throw new AppError('You do not have permission to modify this device', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
}

/**
 * A device counts as online if it's checked in within the configured
 * window. Derived at read time rather than stored, so nothing needs to be
 * kept in sync as heartbeats arrive from the (future) MQTT subscriber.
 */
function deriveStatus(device) {
  const online = Boolean(
    device.lastSeenAt &&
    Date.now() - new Date(device.lastSeenAt).getTime() <= env.device.offlineThresholdSeconds * 1000
  );
  return { ...device, online };
}

export async function registerDevice({ name, firmwareVersion, ownerId: requestedOwnerId }, requester) {
  // Only an Admin can register a device on someone else's behalf; everyone
  // else always registers a device they own themselves.
  const ownerId = requester.role === ROLES.ADMIN && requestedOwnerId ? requestedOwnerId : requester.userId;

  const now = new Date().toISOString();
  const device = {
    deviceId: randomUUID(),
    name,
    ownerId,
    firmwareVersion: firmwareVersion || null,
    lastSeenAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await createDeviceRecord(device);
  await logActivity({ userId: requester.userId, action: 'DEVICE_REGISTERED', metadata: { deviceId: device.deviceId } });
  return deriveStatus(device);
}

export async function getDevice(deviceId, requester) {
  const device = await findDeviceById(deviceId);
  if (!device) {
    throw new AppError('Device not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  assertCanView(device, requester);
  return deriveStatus(device);
}

export async function listDevices(requester, options) {
  const { items, nextCursor } = isManager(requester)
    ? await listAllDevices(options)
    : await findDevicesByOwner(requester.userId, options);

  return { items: items.map(deriveStatus), nextCursor };
}

/**
 * Same role/ownership rule as listDevices(), but follows pagination
 * internally to return the full accessible fleet (bounded by hardCap).
 * Used by the Dashboard module, which needs to aggregate across every
 * device the requester can see, not one page at a time.
 */
export async function getAllAccessibleDevices(requester, { hardCap = 500 } = {}) {
  const items = [];
  let cursor;

  do {
    // eslint-disable-next-line no-await-in-loop
    const page = isManager(requester)
      ? await listAllDevices({ limit: 100, cursor })
      : await findDevicesByOwner(requester.userId, { limit: 100, cursor });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor && items.length < hardCap);

  return items.map(deriveStatus);
}

export async function updateDeviceDetails(deviceId, updates, requester) {
  const device = await findDeviceById(deviceId);
  if (!device) {
    throw new AppError('Device not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  assertCanManage(device, requester);

  // Firmware version changes are treated as an OTA-adjacent action and
  // restricted to Admin/Engineer, even for the device's own Viewer owner.
  if (updates.firmwareVersion !== undefined && !isManager(requester)) {
    throw new AppError('Only an Admin or Engineer can update firmware version', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  const updated = await updateDeviceRecord(deviceId, { ...updates, updatedAt: new Date().toISOString() });
  await logActivity({ userId: requester.userId, action: 'DEVICE_UPDATED', metadata: { deviceId, updates } });
  return deriveStatus(updated);
}

export async function deleteDeviceById(deviceId, requester) {
  const device = await findDeviceById(deviceId);
  if (!device) {
    throw new AppError('Device not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  assertCanManage(device, requester);

  await deleteDeviceRecord(deviceId);
  await logActivity({ userId: requester.userId, action: 'DEVICE_DELETED', metadata: { deviceId } });
}

export async function getDeviceHealth(deviceId, requester) {
  const device = await getDevice(deviceId, requester);
  return {
    deviceId: device.deviceId,
    online: device.online,
    lastSeenAt: device.lastSeenAt,
    firmwareVersion: device.firmwareVersion,
  };
}

/**
 * Called whenever a device checks in. Not exposed as a public endpoint on
 * its own merit - the MQTT subscriber (Module 11) will call this directly
 * for real telemetry. A restricted manual endpoint exists for
 * ops/testing (Admin/Engineer only) - see device.controller.js.
 */
export async function recordDeviceSeen(deviceId, { firmwareVersion } = {}) {
  const device = await findDeviceById(deviceId);
  if (!device) {
    throw new AppError('Device not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const updates = { lastSeenAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (firmwareVersion) updates.firmwareVersion = firmwareVersion;

  const updated = await updateDeviceRecord(deviceId, updates);
  return deriveStatus(updated);
}
