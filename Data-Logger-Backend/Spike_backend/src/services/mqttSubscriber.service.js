import { readFileSync } from 'fs';
import mqtt from 'mqtt';
import { mqttConfig, isMqttConfigured } from '../config/mqtt.config.js';
import { recordDeviceSeen } from '../services/device.service.js';
import { evaluateReading } from '../services/alert.service.js';
import { broadcastDeviceTelemetry } from '../websocket/socket.js';
import { appLogger, errorLogger } from '../config/logger.config.js';

let client = null;

/**
 * Subscribes to the existing IoT Core telemetry topic purely as a second
 * consumer alongside the IoT Rule - it does NOT write to DynamoDB (the
 * Rule already does that). Its only jobs are:
 *   1. Update the device's lastSeenAt (so online/offline reflects reality
 *      in near real-time instead of waiting on the next REST poll)
 *   2. Push the reading straight to connected dashboard clients over
 *      Socket.IO, skipping a DynamoDB round-trip for the live view
 *
 * Historical data still lives only in DynamoDB, exactly as the spec
 * requires - this subscriber never becomes a second source of truth.
 */
function extractDeviceId(topic) {
  // Expected topic shape: devices/{deviceId}/telemetry (see AWS_IOT_MQTT_TOPIC)
  const parts = topic.split('/');
  return parts.length >= 2 ? parts[1] : null;
}

async function handleMessage(topic, payloadBuffer) {
  const deviceId = extractDeviceId(topic);
  if (!deviceId) {
    appLogger.warn('Could not extract deviceId from MQTT topic', { topic });
    return;
  }

  let reading;
  try {
    reading = JSON.parse(payloadBuffer.toString());
  } catch {
    appLogger.warn('Ignoring non-JSON MQTT payload', { topic });
    return;
  }

  try {
    const device = await recordDeviceSeen(deviceId, { firmwareVersion: reading.firmwareVersion });
    broadcastDeviceTelemetry(deviceId, device.ownerId, reading);
    await evaluateReading(device, reading);
  } catch (err) {
    // A device sending telemetry for a deviceId not yet registered in our
    // Devices table shouldn't crash the subscriber - just log and move on.
    errorLogger.error('Failed to process MQTT message', { deviceId, message: err.message });
  }
}

export function startMqttSubscriber() {
  if (!isMqttConfigured()) {
    appLogger.info('AWS IoT certs not configured - MQTT subscriber not started (expected until provisioned)');
    return null;
  }

  client = mqtt.connect(`mqtts://${mqttConfig.endpoint}:8883`, {
    cert: readFileSync(mqttConfig.certPath),
    key: readFileSync(mqttConfig.keyPath),
    ca: readFileSync(mqttConfig.caPath),
    clientId: `iot-energy-backend-${Date.now()}`,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    appLogger.info('Connected to AWS IoT Core', { topic: mqttConfig.topic });
    client.subscribe(mqttConfig.topic, (err) => {
      if (err) errorLogger.error('MQTT subscribe failed', { message: err.message });
    });
  });

  client.on('message', (topic, payload) => {
    handleMessage(topic, payload).catch((err) => errorLogger.error('Unhandled MQTT message error', { message: err.message }));
  });

  client.on('error', (err) => errorLogger.error('MQTT client error', { message: err.message }));
  client.on('reconnect', () => appLogger.info('MQTT reconnecting...'));

  return client;
}

export function stopMqttSubscriber() {
  if (client) {
    client.end();
    client = null;
  }
}
