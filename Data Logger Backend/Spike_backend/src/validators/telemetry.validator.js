import { query, param } from 'express-validator';
import { validate } from './auth.validator.js';

const deviceIdParam = param('deviceId').isString().notEmpty().withMessage('deviceId is required');

const rangeFilter = (field) => [
  query(`${field}Min`).optional().isFloat().withMessage(`${field}Min must be a number`),
  query(`${field}Max`).optional().isFloat().withMessage(`${field}Max must be a number`),
];

export const latestReadingValidator = [deviceIdParam, validate];

export const historyValidator = [
  deviceIdParam,
  query('startDate').optional().isISO8601().withMessage('startDate must be an ISO-8601 date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be an ISO-8601 date'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
  query('cursor').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  ...rangeFilter('voltage'),
  ...rangeFilter('current'),
  ...rangeFilter('temperature'),
  validate,
];

export const statisticsValidator = [
  deviceIdParam,
  query('startDate').optional().isISO8601().withMessage('startDate must be an ISO-8601 date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be an ISO-8601 date'),
  validate,
];
