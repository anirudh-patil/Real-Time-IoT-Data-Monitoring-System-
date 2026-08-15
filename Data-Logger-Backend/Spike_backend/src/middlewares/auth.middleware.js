import { verifyAccessToken } from '../utils/token.util.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Authentication token is required', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (err) {
    return next(err);
  }
}
