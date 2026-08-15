import { checkOfflineDevices } from './alert.service.js';
import { env } from '../config/env.config.js';
import { appLogger, errorLogger } from '../config/logger.config.js';

let intervalHandle = null;

export function startAlertScheduler() {
  if (intervalHandle) return intervalHandle;

  intervalHandle = setInterval(() => {
    checkOfflineDevices().catch((err) => {
      errorLogger.error('Offline sweep failed', { message: err.message });
    });
  }, env.alerts.offlineCheckIntervalSeconds * 1000);

  intervalHandle.unref(); // don't keep the process alive on its own
  appLogger.info('Alert scheduler running', { intervalSeconds: env.alerts.offlineCheckIntervalSeconds });
  return intervalHandle;
}

export function stopAlertScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
