import { env } from './env.config.js';

/**
 * AWS IoT Core requires mutual TLS (X.509 client cert + private key + CA
 * cert) for MQTT connections - a username/password or API key won't work.
 * These are intentionally NOT in the required-env-vars list in
 * env.config.js: the platform must run without them (the existing
 * IoT Rule already writes telemetry to DynamoDB independently of this
 * backend), and this subscriber is additive - real-time push + device
 * heartbeats on top of that, not a replacement for it.
 */
export const mqttConfig = {
  endpoint: env.aws.iot.endpoint,
  topic: env.aws.iot.topic,
  certPath: process.env.AWS_IOT_CERT_PATH,
  keyPath: process.env.AWS_IOT_KEY_PATH,
  caPath: process.env.AWS_IOT_CA_PATH,
};

export function isMqttConfigured() {
  return Boolean(mqttConfig.endpoint && mqttConfig.certPath && mqttConfig.keyPath && mqttConfig.caPath);
}
