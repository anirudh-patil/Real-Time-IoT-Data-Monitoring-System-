import { randomUUID } from 'crypto';
import {
  createAlert,
  getAlertById,
  resolveAlert as resolveAlertRecord,
  findRecentAlertsForDevice,
  findActiveAlertByType,
} from '../repositories/alert.repository.js';
import { findDeviceById, listAllDevices } from '../repositories/device.repository.js';
import { getDevice as getDeviceForRequester } from './device.service.js';
import { broadcastAlert } from '../websocket/socket.js';
import { notifyAlertRaised, notifyAlertResolved } from './notification.service.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ROLES } from '../constants/roles.js';
import { ALERT_TYPES, ALERT_SEVERITY, ALERT_STATUS } from '../constants/alerts.js';
import { env } from '../config/env.config.js';
import { auditLogger } from '../config/logger.config.js';

const MANAGER_ROLES = [ROLES.ADMIN, ROLES.ENGINEER];

async function raiseAlert(device, type, severity, message) {
  const existing = await findActiveAlertByType(device.deviceId, type);
  if (existing) return existing; // condition already flagged, don't spam duplicates

  const alert = {
    alertId: randomUUID(),
    deviceId: device.deviceId,
    type,
    severity,
    message,
    status: ALERT_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  await createAlert(alert);
  broadcastAlert(device.deviceId, device.ownerId, alert);
  notifyAlertRaised(device, alert).catch(() => {}); // already logs internally; never block alert creation
  return alert;
}

async function clearAlert(device, type) {
  const existing = await findActiveAlertByType(device.deviceId, type);
  if (!existing) return null;

  await resolveAlertRecord(existing.alertId);
  const resolved = { ...existing, status: ALERT_STATUS.RESOLVED, resolvedAt: new Date().toISOString() };
  broadcastAlert(device.deviceId, device.ownerId, resolved);
  notifyAlertResolved(device, resolved).catch(() => {});
  return resolved;
}

/**
 * Called by the MQTT subscriber for every incoming reading. Raises an
 * alert the first time a threshold is breached, and auto-resolves it the
 * first time the reading is back within range - no alert lingers "active"
 * once the underlying condition has cleared.
 */
export async function evaluateReading(device, reading) {
  const { voltageMin, voltageMax, currentMax, temperatureMax } = env.alerts;

  if (typeof reading.voltage === 'number') {
    if (reading.voltage > voltageMax) {
      await raiseAlert(device, ALERT_TYPES.HIGH_VOLTAGE, ALERT_SEVERITY.CRITICAL, `Voltage ${reading.voltage}V exceeds maximum of ${voltageMax}V`);
    } else {
      await clearAlert(device, ALERT_TYPES.HIGH_VOLTAGE);
    }

    if (reading.voltage < voltageMin) {
      await raiseAlert(device, ALERT_TYPES.LOW_VOLTAGE, ALERT_SEVERITY.CRITICAL, `Voltage ${reading.voltage}V is below minimum of ${voltageMin}V`);
    } else {
      await clearAlert(device, ALERT_TYPES.LOW_VOLTAGE);
    }
  }

  if (typeof reading.current === 'number') {
    if (reading.current > currentMax) {
      await raiseAlert(device, ALERT_TYPES.HIGH_CURRENT, ALERT_SEVERITY.CRITICAL, `Current ${reading.current}A exceeds maximum of ${currentMax}A`);
    } else {
      await clearAlert(device, ALERT_TYPES.HIGH_CURRENT);
    }
  }

  if (typeof reading.temperature === 'number') {
    if (reading.temperature > temperatureMax) {
      await raiseAlert(device, ALERT_TYPES.HIGH_TEMPERATURE, ALERT_SEVERITY.WARNING, `Temperature ${reading.temperature}\u00b0C exceeds maximum of ${temperatureMax}\u00b0C`);
    } else {
      await clearAlert(device, ALERT_TYPES.HIGH_TEMPERATURE);
    }
  }

  // A reading just arrived, so this device is clearly reachable again -
  // clear any lingering connectivity alerts immediately rather than
  // waiting for the next background sweep.
  await clearAlert(device, ALERT_TYPES.DEVICE_OFFLINE);
  await clearAlert(device, ALERT_TYPES.COMMUNICATION_TIMEOUT);
}

/**
 * Periodic sweep (see alertScheduler.service.js) - telemetry silence is
 * the absence of an event, so it can't be caught by evaluateReading()
 * above. Walks every device (not requester-scoped; this is a system job).
 */
export async function checkOfflineDevices() {
  const { offlineThresholdSeconds, communicationTimeoutSeconds } = { ...env.device, ...env.alerts };
  let cursor;

  do {
    // eslint-disable-next-line no-await-in-loop
    const page = await listAllDevices({ limit: 100, cursor });
    cursor = page.nextCursor;

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      page.items.map(async (device) => {
        const silentForMs = device.lastSeenAt ? Date.now() - new Date(device.lastSeenAt).getTime() : Infinity;

        if (silentForMs >= communicationTimeoutSeconds * 1000) {
          await raiseAlert(device, ALERT_TYPES.COMMUNICATION_TIMEOUT, ALERT_SEVERITY.CRITICAL, `No telemetry received for over ${communicationTimeoutSeconds}s`);
        } else if (silentForMs >= offlineThresholdSeconds * 1000) {
          await raiseAlert(device, ALERT_TYPES.DEVICE_OFFLINE, ALERT_SEVERITY.WARNING, `No telemetry received for over ${offlineThresholdSeconds}s`);
        }
      })
    );
  } while (cursor);
}

async function assertDeviceAccess(deviceId, requester) {
  await getDeviceForRequester(deviceId, requester); // reuses the same ownership rule as Device/Telemetry modules
}

export async function getAlert(alertId, requester) {
  const alert = await getAlertById(alertId);
  if (!alert) {
    throw new AppError('Alert not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  await assertDeviceAccess(alert.deviceId, requester);
  return alert;
}

export async function listAlertsForDevice(deviceId, requester, options) {
  await assertDeviceAccess(deviceId, requester);
  const { items, nextCursor } = await findRecentAlertsForDevice(deviceId, options);
  const filtered = options?.status ? items.filter((a) => a.status === options.status) : items;
  return { items: filtered, nextCursor };
}

export async function resolveAlertManually(alertId, requester) {
  if (!MANAGER_ROLES.includes(requester.role)) {
    throw new AppError('Only an Admin or Engineer can resolve an alert', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  const alert = await getAlertById(alertId);
  if (!alert) {
    throw new AppError('Alert not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  if (alert.status === ALERT_STATUS.RESOLVED) {
    return alert;
  }

  await resolveAlertRecord(alertId);
  const device = await findDeviceById(alert.deviceId);
  const resolved = { ...alert, status: ALERT_STATUS.RESOLVED, resolvedAt: new Date().toISOString() };

  if (device) {
    broadcastAlert(alert.deviceId, device.ownerId, resolved);
    notifyAlertResolved(device, resolved).catch(() => {});
  }
  auditLogger.info('Alert manually resolved', { actorId: requester.userId, alertId, deviceId: alert.deviceId, type: alert.type });
  return resolved;
}
