/**
 * Not implemented - no SMS provider (Twilio, SNS, etc.) is wired up yet.
 * This exists so notification.service.js's channel loop works unchanged
 * the day SMS is added: implement send() here, add 'sms' to
 * NOTIFICATION_CHANNELS in .env, done.
 */
export async function send({ to, text }) {
  console.log(`[sms] (not implemented) Would send to ${to}: ${text}`);
  return { delivered: false, reason: 'SMS channel not implemented yet' };
}
