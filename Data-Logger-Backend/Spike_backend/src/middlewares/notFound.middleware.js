import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { sendError } from '../utils/apiResponse.js';

export function notFoundMiddleware(req, res) {
  return sendError(res, {
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorCode: ERROR_CODES.NOT_FOUND,
  });
}
