import { body, validationResult } from 'express-validator';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { sendError } from '../utils/apiResponse.js';
import { ROLES } from '../constants/roles.js';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return sendError(res, {
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: errors.array({ onlyFirstError: true })[0].msg,
    errorCode: ERROR_CODES.VALIDATION_ERROR,
  });
}

const PASSWORD_RULES = body('password')
  .isString()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/\d/)
  .withMessage('Password must contain at least one number');

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  PASSWORD_RULES,
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  validate,
];

export const loginValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
];

export const refreshTokenValidator = [
  body('refreshToken').isString().notEmpty().withMessage('refreshToken is required'),
  validate,
];

export const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  validate,
];

export const resetPasswordValidator = [
  body('token').isString().notEmpty().withMessage('token is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  validate,
];

export const changePasswordValidator = [
  body('currentPassword').isString().notEmpty().withMessage('currentPassword is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  validate,
];
