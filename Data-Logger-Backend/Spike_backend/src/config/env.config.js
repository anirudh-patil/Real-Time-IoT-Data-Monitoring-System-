import dotenv from 'dotenv';

dotenv.config();

/**
 * Required environment variables.
 * The process will fail fast at startup if any of these are missing,
 * rather than failing later inside a request handler.
 */
const REQUIRED_ENV_VARS = [
  'AWS_REGION',
  'DYNAMODB_TELEMETRY_TABLE',
  'DYNAMODB_USERS_TABLE',
  'DYNAMODB_DEVICES_TABLE',
  'DYNAMODB_ALERTS_TABLE',
  'DYNAMODB_REFRESH_TOKENS_TABLE',
  'DYNAMODB_ACTIVITY_LOGS_TABLE',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'AWS_S3_PROFILE_IMAGES_BUCKET',
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    // Intentionally thrown (not logged via winston) - logger depends on
    // config being valid first, so this must fail before logger init.
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

validateEnv();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    iot: {
      endpoint: process.env.AWS_IOT_ENDPOINT,
      topic: process.env.AWS_IOT_MQTT_TOPIC || 'devices/+/telemetry',
    },
  },

  dynamodb: {
    telemetryTable: process.env.DYNAMODB_TELEMETRY_TABLE,
    usersTable: process.env.DYNAMODB_USERS_TABLE,
    devicesTable: process.env.DYNAMODB_DEVICES_TABLE,
    alertsTable: process.env.DYNAMODB_ALERTS_TABLE,
    refreshTokensTable: process.env.DYNAMODB_REFRESH_TOKENS_TABLE,
    activityLogsTable: process.env.DYNAMODB_ACTIVITY_LOGS_TABLE,
  },

  s3: {
    bucket: process.env.AWS_S3_PROFILE_IMAGES_BUCKET,
  },

  device: {
    offlineThresholdSeconds: parseInt(process.env.DEVICE_OFFLINE_THRESHOLD_SECONDS, 10) || 300,
  },

  alerts: {
    voltageMin: parseFloat(process.env.ALERT_VOLTAGE_MIN) || 200,
    voltageMax: parseFloat(process.env.ALERT_VOLTAGE_MAX) || 250,
    currentMax: parseFloat(process.env.ALERT_CURRENT_MAX) || 10,
    temperatureMax: parseFloat(process.env.ALERT_TEMPERATURE_MAX) || 60,
    communicationTimeoutSeconds: parseInt(process.env.ALERT_COMMUNICATION_TIMEOUT_SECONDS, 10) || 900,
    offlineCheckIntervalSeconds: parseInt(process.env.ALERT_OFFLINE_CHECK_INTERVAL_SECONDS, 10) || 60,
  },

  notifications: {
    channels: (process.env.NOTIFICATION_CHANNELS || 'email')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME || 'IoT Energy Monitoring Platform',
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'src/logs',
  },
};
