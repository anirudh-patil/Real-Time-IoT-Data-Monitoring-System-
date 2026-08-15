import { sendEmail } from '../../utils/email.util.js';

export async function send({ to, subject, text, html }) {
  return sendEmail({ to, subject, text, html });
}
