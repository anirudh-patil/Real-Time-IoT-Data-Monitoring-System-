import { body, query, param } from 'express-validator';
import { validate } from './auth.validator.js';
import { ROLES } from '../constants/roles.js';

export const updateProfileValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  validate,
];

export const listUsersValidator = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('cursor').optional().isString(),
  validate,
];

export const userIdParamValidator = [
  param('userId').isString().notEmpty().withMessage('userId is required'),
  validate,
];

export const adminUpdateUserValidator = [
  param('userId').isString().notEmpty().withMessage('userId is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validate,
];
