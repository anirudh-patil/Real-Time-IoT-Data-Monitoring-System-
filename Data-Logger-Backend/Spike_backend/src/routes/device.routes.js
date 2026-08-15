import { Router } from 'express';
import * as deviceController from '../controllers/device.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { ROLES } from '../constants/roles.js';
import {
  registerDeviceValidator,
  updateDeviceValidator,
  deviceIdParamValidator,
  listDevicesValidator,
  heartbeatValidator,
} from '../validators/device.validator.js';

const router = Router();

router.use(authenticate); // every route below requires a valid access token

// Ownership vs role checks happen inside device.service.js (a Viewer can
// manage their own devices; Admin/Engineer can manage any device).

/**
 * @openapi
 * /devices:
 *   post:
 *     tags: [Devices]
 *     summary: Register a device (owned by you, or by ownerId if you're an Admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               firmwareVersion: { type: string }
 *               ownerId: { type: string, description: Admin only }
 *     responses:
 *       201:
 *         description: Device registered
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties: { data: { type: object, properties: { device: { $ref: '#/components/schemas/Device' } } } }
 *   get:
 *     tags: [Devices]
 *     summary: List devices - all devices for Admin/Engineer, own devices for Viewer
 *     parameters:
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CursorParam'
 *     responses:
 *       200: { description: Paginated device list }
 */
router.post('/', registerDeviceValidator, deviceController.registerDevice);
router.get('/', listDevicesValidator, deviceController.listDevices);

/**
 * @openapi
 * /devices/{deviceId}:
 *   get:
 *     tags: [Devices]
 *     summary: Get a device (owner, or Admin/Engineer)
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Device
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties: { data: { type: object, properties: { device: { $ref: '#/components/schemas/Device' } } } }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     tags: [Devices]
 *     summary: Update a device (firmwareVersion is Admin/Engineer only)
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               firmwareVersion: { type: string }
 *     responses:
 *       200: { description: Device updated }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   delete:
 *     tags: [Devices]
 *     summary: Delete a device (owner, or Admin/Engineer)
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Device deleted }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/:deviceId', deviceIdParamValidator, deviceController.getDevice);
router.patch('/:deviceId', updateDeviceValidator, deviceController.updateDevice);
router.delete('/:deviceId', deviceIdParamValidator, deviceController.deleteDevice);

/**
 * @openapi
 * /devices/{deviceId}/health:
 *   get:
 *     tags: [Devices]
 *     summary: Get a device's derived health (online/offline, lastSeenAt, firmware)
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Device health }
 */
router.get('/:deviceId/health', deviceIdParamValidator, deviceController.getDeviceHealth);

/**
 * @openapi
 * /devices/{deviceId}/heartbeat:
 *   patch:
 *     tags: [Devices]
 *     summary: Admin/Engineer only - manually record a device heartbeat (ops/testing; real heartbeats come from the MQTT subscriber)
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { firmwareVersion: { type: string } } }
 *     responses:
 *       200: { description: Heartbeat recorded }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.patch(
  '/:deviceId/heartbeat',
  authorize(ROLES.ADMIN, ROLES.ENGINEER),
  heartbeatValidator,
  deviceController.recordHeartbeat
);

export default router;
