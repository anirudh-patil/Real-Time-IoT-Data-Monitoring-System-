import { AppError } from './apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Every repository method should call DynamoDB through this wrapper so a
 * raw AWS SDK exception never reaches a controller. Keeps repositories
 * free of try/catch boilerplate while still giving callers a meaningful
 * statusCode/errorCode instead of a generic 500.
 */
export async function withDynamoErrors(operation) {
  try {
    return await operation();
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      throw new AppError('Item already exists or was modified concurrently', HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
    }
    if (err.name === 'ResourceNotFoundException') {
      throw new AppError('A required table is not reachable', HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.SERVICE_UNAVAILABLE);
    }
    if (err.name === 'ProvisionedThroughputExceededException' || err.name === 'RequestLimitExceeded') {
      throw new AppError('Database is under heavy load, please retry', HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED);
    }
    if (err.name === 'ValidationException') {
      throw new AppError('Invalid database query parameters', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    }
    // Anything else (network errors, credentials, unmodeled AWS errors)
    // is a genuine internal error - let it map to 500 via AppError default.
    throw new AppError(err.message || 'Database operation failed', HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.AWS_ERROR);
  }
}
