import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

/**
 * Enforces the standard response envelope defined in the spec (section 16):
 *
 * Success: { success, message, data, timestamp, requestId }
 * Error:   { success:false, message, errorCode, timestamp, requestId }
 */

export function sendSuccess(res, {
  statusCode = HTTP_STATUS.OK,
  message = 'Success',
  data = null,
} = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.req?.requestId,
  });
}

export function sendError(res, {
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  message = 'Something went wrong',
  errorCode = 'INTERNAL_ERROR',
} = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    timestamp: new Date().toISOString(),
    requestId: res.req?.requestId,
  });
}

/**
 * Custom application error class. Services/repositories throw this so
 * the central error handler can translate it directly into the standard
 * error envelope without guessing status codes.
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
