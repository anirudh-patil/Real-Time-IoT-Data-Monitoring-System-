import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { sendError } from '../utils/apiResponse.js';
import { env } from '../config/env.config.js';
import { errorLogger } from '../config/logger.config.js';

/**
 * All application errors funnel through here and land in the error log
 * (see logger.config.js) - this was previously console.error as a
 * placeholder pending this module.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandlerMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errorCode = err.errorCode || ERROR_CODES.INTERNAL_ERROR;
  const message = err.isOperational
    ? err.message
    : 'Internal server error';

  errorLogger.error(err.message, {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    errorCode,
    stack: err.stack,
  });

  return sendError(res, {
    statusCode,
    message: env.isProduction && !err.isOperational ? 'Internal server error' : message,
    errorCode,
  });
}
