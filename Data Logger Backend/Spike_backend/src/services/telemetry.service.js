import { findLatestReading, findHistory, findAllForRange } from '../repositories/telemetry.repository.js';
import { getDevice } from './device.service.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const STAT_FIELDS = ['voltage', 'current', 'temperature', 'power'];

/**
 * Telemetry belongs to a device, and a device belongs to a user - so
 * "can I see this device's telemetry" reuses the exact same ownership
 * rule as the Device module (owner, or Admin/Engineer) rather than
 * duplicating it here.
 */
async function assertDeviceAccess(deviceId, requester) {
  // getDevice() already throws 404/403 as appropriate.
  await getDevice(deviceId, requester);
}

export async function getLatestReading(deviceId, requester) {
  await assertDeviceAccess(deviceId, requester);
  const reading = await findLatestReading(deviceId);
  if (!reading) {
    throw new AppError('No telemetry readings found for this device', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return reading;
}

export async function getHistory(deviceId, requester, options) {
  await assertDeviceAccess(deviceId, requester);
  return findHistory(deviceId, options);
}

export function computeStats(readings) {
  const stats = {};
  for (const field of STAT_FIELDS) {
    const values = readings.map((r) => r[field]).filter((v) => typeof v === 'number');
    if (values.length === 0) {
      stats[field] = { avg: null, min: null, max: null };
      continue;
    }
    const sum = values.reduce((acc, v) => acc + v, 0);
    stats[field] = {
      avg: Number((sum / values.length).toFixed(2)),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
  return stats;
}

export async function getStatistics(deviceId, requester, { startDate, endDate } = {}) {
  await assertDeviceAccess(deviceId, requester);
  const readings = await findAllForRange(deviceId, { startDate, endDate });
  const stats = computeStats(readings);

  return {
    deviceId,
    sampleCount: readings.length,
    range: { startDate: startDate || null, endDate: endDate || null },
    stats,
  };
}
