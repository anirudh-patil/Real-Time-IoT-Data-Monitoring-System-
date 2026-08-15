import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env.config.js';
import { AppError } from './apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

const RESET_PASSWORD_PURPOSE = 'password_reset';
const RESET_PASSWORD_EXPIRY = '15m';

/**
 * Access token: short-lived, sent on every request via Authorization header.
 */
export function generateAccessToken({ userId, email, role }) {
  return jwt.sign({ sub: userId, email, role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid access token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }
}

/**
 * Refresh token: long-lived. A random `tokenId` (jti) is embedded so the
 * server can look up / revoke this specific token in the RefreshTokens
 * table without storing the raw JWT (only its hash is stored).
 */
export function generateRefreshToken({ userId }) {
  const tokenId = randomUUID();
  const token = jwt.sign({ sub: userId, jti: tokenId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  });
  return { token, tokenId };
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }
}

/**
 * Password reset token: short-lived JWT, not persisted in the DB.
 * Purpose claim prevents an access/refresh token from being replayed here.
 */
export function generatePasswordResetToken({ userId }) {
  return jwt.sign({ sub: userId, purpose: RESET_PASSWORD_PURPOSE }, env.jwt.accessSecret, {
    expiresIn: RESET_PASSWORD_EXPIRY,
  });
}

export function verifyPasswordResetToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Password reset link has expired', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid password reset link', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  if (payload.purpose !== RESET_PASSWORD_PURPOSE) {
    throw new AppError('Invalid password reset link', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  return payload;
}
