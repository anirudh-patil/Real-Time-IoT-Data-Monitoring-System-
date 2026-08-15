import { AppError } from './apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * DynamoDB's LastEvaluatedKey is an object, not a string, so it can't go
 * directly in a query param. Previously controllers did
 * `JSON.parse(req.query.cursor)` directly on client input - functional,
 * but it exposes the raw DynamoDB key shape and throws an unhandled
 * SyntaxError on malformed input instead of a clean 422. This wraps that
 * in an opaque base64 token with proper error handling.
 */
export function encodeCursor(lastEvaluatedKey) {
  if (!lastEvaluatedKey) return null;
  return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64url');
}

export function decodeCursor(cursor) {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    throw new AppError('Invalid pagination cursor', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
  }
}
