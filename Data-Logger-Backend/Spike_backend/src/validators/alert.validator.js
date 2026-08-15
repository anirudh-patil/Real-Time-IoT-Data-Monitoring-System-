import { param, query } from 'express-validator';
import { validate } from './auth.validator.js';
import { ALERT_STATUS } from '../constants/alerts.js';

export const alertIdParamValidator = [
  param('alertId').isString().notEmpty().withMessage('alertId is required'),
  validate,
];

export const deviceAlertsValidator = [
  param('deviceId').isString().notEmpty().withMessage('deviceId is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('cursor').optional().isString(),
  query('status').optional().isIn(Object.values(ALERT_STATUS)).withMessage('status must be active or resolved'),
  validate,
];
