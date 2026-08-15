import { body, query, param } from 'express-validator';
import { validate } from './auth.validator.js';

export const registerDeviceValidator = [
  body('name').trim().notEmpty().withMessage('Device name is required'),
  body('firmwareVersion').optional().isString(),
  body('ownerId').optional().isString(),
  validate,
];

export const updateDeviceValidator = [
  param('deviceId').isString().notEmpty(),
  body('name').optional().trim().notEmpty().withMessage('Device name cannot be empty'),
  body('firmwareVersion').optional().isString(),
  validate,
];

export const deviceIdParamValidator = [
  param('deviceId').isString().notEmpty().withMessage('deviceId is required'),
  validate,
];

export const listDevicesValidator = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('cursor').optional().isString(),
  validate,
];

export const heartbeatValidator = [
  param('deviceId').isString().notEmpty(),
  body('firmwareVersion').optional().isString(),
  validate,
];
