import { query } from 'express-validator';
import { validate } from './auth.validator.js';

export const periodStatisticsValidator = [
  query('period').isIn(['daily', 'weekly', 'monthly']).withMessage('period must be daily, weekly, or monthly'),
  validate,
];
