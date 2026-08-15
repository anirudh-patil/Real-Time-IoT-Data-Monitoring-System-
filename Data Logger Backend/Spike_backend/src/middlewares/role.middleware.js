import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Usage: router.post('/devices', authenticate, authorize('admin', 'engineer'), handler)
 * Must run after `authenticate` so req.user is populated.
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN));
    }

    return next();
  };
}
