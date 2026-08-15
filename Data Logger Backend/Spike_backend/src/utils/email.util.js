import nodemailer from 'nodemailer';
import { env } from '../config/env.config.js';
import { appLogger } from '../config/logger.config.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.host) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  });

  return transporter;
}

/**
 * Sends a plain-text/HTML email if SMTP is configured. In development
 * (or if SMTP isn't configured yet) it logs the email instead of failing,
 * so the auth flows remain testable without real SMTP credentials.
 *
 * NOTE: This is a minimal stub. Proper templating (branded emails, retries,
 * queueing) is built out in the Notifications module (spec section 13).
 */
export async function sendEmail({ to, subject, text, html }) {
  const client = getTransporter();

  if (!client) {
    appLogger.info('Email dev-fallback (SMTP not configured)', { to, subject });
    return { delivered: false, reason: 'SMTP not configured' };
  }

  await client.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true };
}
