import { Router } from 'express';
import * as telemetryController from '../controllers/telemetry.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  latestReadingValidator,
  historyValidator,
  statisticsValidator,
} from '../validators/telemetry.validator.js';

const router = Router();

router.use(authenticate);

// Ownership vs role checks happen inside telemetry.service.js, reusing
// device.service.js's rules (owner, or Admin/Engineer).

/**
 * @openapi
 * /telemetry/{deviceId}/latest:
 *   get:
 *     tags: [Telemetry]
 *     summary: Get the most recent reading for a device
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Latest reading
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties: { data: { type: object, properties: { reading: { $ref: '#/components/schemas/TelemetryReading' } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { description: No readings found for this device }
 */
router.get('/:deviceId/latest', latestReadingValidator, telemetryController.getLatestReading);

/**
 * @openapi
 * /telemetry/{deviceId}/history:
 *   get:
 *     tags: [Telemetry]
 *     summary: Paginated telemetry history with date range, sort order, and value filters
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: startDate
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: endDate
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: sortOrder
 *         in: query
 *         schema: { type: string, enum: [asc, desc] }
 *       - name: voltageMin
 *         in: query
 *         schema: { type: number }
 *       - name: voltageMax
 *         in: query
 *         schema: { type: number }
 *       - name: currentMin
 *         in: query
 *         schema: { type: number }
 *       - name: currentMax
 *         in: query
 *         schema: { type: number }
 *       - name: temperatureMin
 *         in: query
 *         schema: { type: number }
 *       - name: temperatureMax
 *         in: query
 *         schema: { type: number }
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CursorParam'
 *     responses:
 *       200: { description: Paginated readings }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:deviceId/history', historyValidator, telemetryController.getHistory);

/**
 * @openapi
 * /telemetry/{deviceId}/statistics:
 *   get:
 *     tags: [Telemetry]
 *     summary: Aggregate voltage/current/temperature/power stats over a date range
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: startDate
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: endDate
 *         in: query
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Statistics (avg/min/max per field) }
 */
router.get('/:deviceId/statistics', statisticsValidator, telemetryController.getStatistics);

export default router;
