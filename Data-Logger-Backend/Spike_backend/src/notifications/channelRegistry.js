import * as emailChannel from './channels/email.channel.js';
import * as smsChannel from './channels/sms.channel.js';
import * as pushChannel from './channels/push.channel.js';

/**
 * Which channels actually fire is controlled by NOTIFICATION_CHANNELS in
 * .env (default: just 'email'). Adding a real SMS/push provider later is
 * just implementing that channel's send() and adding its name to the env
 * var - notification.service.js doesn't change.
 */
export const CHANNELS = {
  email: emailChannel,
  sms: smsChannel,
  push: pushChannel,
};
