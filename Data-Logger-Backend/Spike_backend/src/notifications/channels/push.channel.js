/**
 * Not implemented - no push provider (FCM, APNs, etc.) is wired up yet.
 * Same pattern as sms.channel.js: implement send() here, add 'push' to
 * NOTIFICATION_CHANNELS in .env, done.
 */
export async function send({ to, subject, text }) {
  console.log(`[push] (not implemented) Would send to ${to}: ${subject}`);
  return { delivered: false, reason: 'Push channel not implemented yet' };
}
