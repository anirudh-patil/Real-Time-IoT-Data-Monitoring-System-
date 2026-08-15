import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './env.config.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

const consoleFormat = combine(
  colorize(),
  timestamp(),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}] ${message}${metaStr}`;
  })
);

function rotateTransport(namePrefix, level) {
  return new DailyRotateFile({
    dirname: env.logging.dir,
    filename: `${namePrefix}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d',
    level,
    format: fileFormat,
  });
}

const consoleTransport = new winston.transports.Console({ format: consoleFormat });

// --- Application log: general app lifecycle (startup, MQTT, scheduler, etc.) ---
export const appLogger = winston.createLogger({
  level: env.logging.level,
  transports: [rotateTransport('application', env.logging.level), ...(env.isProduction ? [] : [consoleTransport])],
});

// --- Error log: everything at error level, app-wide (also see errorHandler.middleware.js) ---
export const errorLogger = winston.createLogger({
  level: 'error',
  transports: [rotateTransport('error', 'error'), ...(env.isProduction ? [] : [consoleTransport])],
});

// --- Authentication log: register/login/logout/password events ---
export const authLogger = winston.createLogger({
  level: 'info',
  transports: [rotateTransport('auth', 'info'), ...(env.isProduction ? [] : [consoleTransport])],
});

// --- API request log: one line per HTTP request (see requestLogger.middleware.js) ---
export const requestLogger = winston.createLogger({
  level: 'info',
  transports: [rotateTransport('requests', 'info')],
});

/**
 * Audit log: WHO did WHAT admin/destructive action to WHOM. Distinct from
 * authLogger (login/logout/password events) and the user-facing activity
 * history in DynamoDB (self-service "your recent activity" - see
 * activityLog.repository.js). This one is for compliance/incident review:
 * role changes, account deactivation/deletion by an admin, manual alert
 * resolution - the things a security review would ask "who approved this?"
 */
export const auditLogger = winston.createLogger({
  level: 'info',
  transports: [rotateTransport('audit', 'info'), ...(env.isProduction ? [] : [consoleTransport])],
});
