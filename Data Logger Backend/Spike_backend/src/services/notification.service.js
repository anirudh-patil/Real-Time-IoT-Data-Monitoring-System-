import { CHANNELS } from '../notifications/channelRegistry.js';
import { buildAlertRaisedTemplate, buildAlertResolvedTemplate } from '../notifications/templates/alertTemplate.js';
import { findUserById } from '../repositories/user.repository.js';
import { env } from '../config/env.config.js';
import { appLogger, errorLogger } from '../config/logger.config.js';

async function dispatch({ to, subject, text }) {
  const results = {};

  for (const channelName of env.notifications.channels) {
    const channel = CHANNELS[channelName];
    if (!channel) {
      appLogger.warn(`Unknown notification channel "${channelName}" in NOTIFICATION_CHANNELS, skipping`);
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      results[channelName] = await channel.send({ to, subject, text });
    } catch (err) {
      errorLogger.error(`Notification channel "${channelName}" failed`, { message: err.message });
      results[channelName] = { delivered: false, reason: err.message };
    }
  }

  return results;
}

async function notifyDeviceOwner(device, template) {
  try {
    const user = await findUserById(device.ownerId);
    if (!user) return null;
    return await dispatch({ to: user.email, ...template });
  } catch (err) {
    // A notification failure should never break the alert/telemetry flow
    // that triggered it - log and move on.
    errorLogger.error('Failed to notify device owner', { message: err.message });
    return null;
  }
}

export async function notifyAlertRaised(device, alert) {
  return notifyDeviceOwner(device, buildAlertRaisedTemplate({ device, alert }));
}

export async function notifyAlertResolved(device, alert) {
  return notifyDeviceOwner(device, buildAlertResolvedTemplate({ device, alert }));
}
