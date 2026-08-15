import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.config.js';

/**
 * Route files carry the actual per-endpoint JSDoc (@openapi blocks).
 * This file only defines the shared building blocks - security scheme and
 * reusable schemas - so each route's annotation can stay short and
 * reference these by $ref instead of repeating the shape every time.
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'IoT Energy Monitoring Platform API',
    version: '1.0.0',
    description:
      'Backend API for the IoT Energy Monitoring Platform. Reads telemetry from the existing ' +
      'STM32 -> ESP32 -> MQTT -> AWS IoT Core -> IoT Rule -> DynamoDB pipeline; never writes to that table.',
  },
  servers: [{ url: `/api/${env.apiVersion}`, description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
      User: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'engineer', 'viewer'] },
          isActive: { type: 'boolean' },
          profileImageUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Device: {
        type: 'object',
        properties: {
          deviceId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          ownerId: { type: 'string', format: 'uuid' },
          firmwareVersion: { type: 'string', nullable: true },
          lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
          online: { type: 'boolean', description: 'Derived from lastSeenAt vs DEVICE_OFFLINE_THRESHOLD_SECONDS' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TelemetryReading: {
        type: 'object',
        properties: {
          deviceId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          voltage: { type: 'number' },
          current: { type: 'number' },
          temperature: { type: 'number' },
          power: { type: 'number' },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          alertId: { type: 'string', format: 'uuid' },
          deviceId: { type: 'string' },
          type: {
            type: 'string',
            enum: ['HIGH_VOLTAGE', 'LOW_VOLTAGE', 'HIGH_CURRENT', 'HIGH_TEMPERATURE', 'DEVICE_OFFLINE', 'COMMUNICATION_TIMEOUT'],
          },
          severity: { type: 'string', enum: ['warning', 'critical'] },
          message: { type: 'string' },
          status: { type: 'string', enum: ['active', 'resolved'] },
          createdAt: { type: 'string', format: 'date-time' },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
    parameters: {
      LimitParam: {
        name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200 },
        description: 'Page size',
      },
      CursorParam: {
        name: 'cursor', in: 'query', schema: { type: 'string' },
        description: 'Opaque pagination cursor returned as nextCursor from a previous call',
      },
    },
    responses: {
      ValidationError: {
        description: 'Request failed validation',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      },
      Unauthorized: {
        description: 'Missing or invalid access token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      },
      Forbidden: {
        description: 'Authenticated but not permitted to perform this action',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: ['./src/routes/*.js'],
});
