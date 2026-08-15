import { Router } from 'express';
import * as alertController from '../controllers/alert.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { ROLES } from '../constants/roles.js';
import { alertIdParamValidator, deviceAlertsValidator } from '../validators/alert.validator.js';

const router = Router();

router.use(authenticate);

// Ownership vs role checks happen inside alert.service.js, reusing
// device.service.js's rules (owner, or Admin/Engineer).

/**
 * @openapi
 * /alerts/device/{deviceId}:
 *   get:
 *     tags: [Alerts]
 *     summary: Get alert history for a device (owner, or Admin/Engineer)
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: status
 *         in: query
 *         schema: { type: string, enum: [active, resolved] }
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/CursorParam'
 *     responses:
 *       200:
 *         description: Paginated alert history
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         items: { type: array, items: { $ref: '#/components/schemas/Alert' } }
 *                         nextCursor: { type: string, nullable: true }
 */
router.get('/device/:deviceId', deviceAlertsValidator, alertController.listAlertsForDevice);

/**
 * @openapi
 * /alerts/{alertId}:
 *   get:
 *     tags: [Alerts]
 *     summary: Get a single alert (owner of the device, or Admin/Engineer)
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Alert
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties: { data: { type: object, properties: { alert: { $ref: '#/components/schemas/Alert' } } } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get('/:alertId', alertIdParamValidator, alertController.getAlert);

/**
 * @openapi
 * /alerts/{alertId}/resolve:
 *   patch:
 *     tags: [Alerts]
 *     summary: Admin/Engineer only - manually resolve an active alert
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Alert resolved }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch('/:alertId/resolve', authorize(ROLES.ADMIN, ROLES.ENGINEER), alertIdParamValidator, alertController.resolveAlert);

export default router;
