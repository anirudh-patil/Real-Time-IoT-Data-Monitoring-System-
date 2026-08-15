import { getAllAccessibleDevices } from './device.service.js';
import { findLatestReading, findAllForRange } from '../repositories/telemetry.repository.js';
import { findRecentAlertsForDevice } from '../repositories/alert.repository.js';
import { computeStats } from './telemetry.service.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

// Bounds on per-request fan-out so a dashboard call stays bounded even on
// a fleet of 1000+ devices. Beyond these caps, this endpoint should be
// backed by a pre-aggregated rollup rather than live fan-out - a
// reasonable next step once real usage data shows this matters.
const LATEST_READINGS_DEVICE_CAP = 50;
const ALERTS_DEVICE_SAMPLE_CAP = 50;
const STATISTICS_DEVICE_SAMPLE_CAP = 30;

const PERIOD_TO_MS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

function periodToDateRange(period) {
  const ms = PERIOD_TO_MS[period];
  if (!ms) {
    throw new AppError('period must be daily, weekly, or monthly', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - ms);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

async function getLatestReadingsForDevices(devices) {
  const sample = devices.slice(0, LATEST_READINGS_DEVICE_CAP);
  const readings = await Promise.all(
    sample.map(async (device) => ({ deviceId: device.deviceId, reading: await findLatestReading(device.deviceId) }))
  );
  return readings.filter((r) => r.reading !== null);
}

async function getRecentAlertsForDevices(devices, { limit = 10 } = {}) {
  const sample = devices.slice(0, ALERTS_DEVICE_SAMPLE_CAP);
  const perDevice = await Promise.all(
    sample.map((device) => findRecentAlertsForDevice(device.deviceId, { limit: 5 }))
  );
  return perDevice
    .flat()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

export async function getSummary(requester) {
  const devices = await getAllAccessibleDevices(requester);
  const onlineDevices = devices.filter((d) => d.online);
  const offlineDevices = devices.filter((d) => !d.online);

  const latestReadingEntries = await getLatestReadingsForDevices(devices);
  const latestValues = latestReadingEntries.map((e) => e.reading);
  const averages = computeStats(latestValues);

  const recentAlerts = await getRecentAlertsForDevices(devices, { limit: 10 });

  return {
    deviceCounts: {
      total: devices.length,
      online: onlineDevices.length,
      offline: offlineDevices.length,
    },
    latestReadings: latestReadingEntries,
    averages: {
      voltage: averages.voltage,
      current: averages.current,
      temperature: averages.temperature,
    },
    recentAlerts,
    ...(devices.length > LATEST_READINGS_DEVICE_CAP
      ? { note: `Latest readings limited to the first ${LATEST_READINGS_DEVICE_CAP} devices out of ${devices.length}.` }
      : {}),
  };
}

export async function getPeriodStatistics(requester, period) {
  const { startDate, endDate } = periodToDateRange(period);
  const devices = await getAllAccessibleDevices(requester);
  const sample = devices.slice(0, STATISTICS_DEVICE_SAMPLE_CAP);

  const perDeviceReadings = await Promise.all(
    sample.map((device) => findAllForRange(device.deviceId, { startDate, endDate }))
  );
  const allReadings = perDeviceReadings.flat();

  return {
    period,
    range: { startDate, endDate },
    deviceCount: sample.length,
    sampleCount: allReadings.length,
    stats: computeStats(allReadings),
    ...(devices.length > STATISTICS_DEVICE_SAMPLE_CAP
      ? { note: `Statistics limited to a sample of ${STATISTICS_DEVICE_SAMPLE_CAP} devices out of ${devices.length}.` }
      : {}),
  };
}
