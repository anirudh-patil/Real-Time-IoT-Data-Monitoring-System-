export const ALERT_TYPES = Object.freeze({
  HIGH_VOLTAGE: 'HIGH_VOLTAGE',
  LOW_VOLTAGE: 'LOW_VOLTAGE',
  HIGH_CURRENT: 'HIGH_CURRENT',
  HIGH_TEMPERATURE: 'HIGH_TEMPERATURE',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  COMMUNICATION_TIMEOUT: 'COMMUNICATION_TIMEOUT',
});

export const ALERT_SEVERITY = Object.freeze({
  WARNING: 'warning',
  CRITICAL: 'critical',
});

export const ALERT_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESOLVED: 'resolved',
});
