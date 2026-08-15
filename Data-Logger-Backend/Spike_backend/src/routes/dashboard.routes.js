import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { periodStatisticsValidator } from '../validators/dashboard.validator.js';

const router = Router();

router.use(authenticate);

// Scoped to the requester's accessible fleet - full fleet for
// Admin/Engineer, own devices only for Viewer (see device.service.js).

/**
 * @openapi
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Device counts, latest readings, averages, and recent alerts for your accessible fleet
 *     responses:
 *       200: { description: Dashboard summary }
 */
router.get('/summary', dashboardController.getSummary);

/**
 * @openapi
 * /dashboard/statistics:
 *   get:
 *     tags: [Dashboard]
 *     summary: Fleet-wide voltage/current/temperature stats over a period
 *     parameters:
 *       - name: period
 *         in: query
 *         required: true
 *         schema: { type: string, enum: [daily, weekly, monthly] }
 *     responses:
 *       200: { description: Period statistics }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/statistics', periodStatisticsValidator, dashboardController.getPeriodStatistics);

export default router;
