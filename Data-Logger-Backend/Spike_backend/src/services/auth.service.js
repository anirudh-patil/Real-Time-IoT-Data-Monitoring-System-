import { randomUUID } from 'crypto';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from '../repositories/user.repository.js';
import {
  storeRefreshToken,
  findRefreshTokenById,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
} from '../repositories/refreshToken.repository.js';
import { hashPassword, comparePassword } from '../utils/password.util.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../utils/token.util.js';
import { sha256 } from '../utils/hash.util.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { authLogger } from '../config/logger.config.js';
import { sendEmail } from '../utils/email.util.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { ROLES } from '../constants/roles.js';
import { env } from '../config/env.config.js';

function sanitizeUser(user) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

function refreshExpiryToDate() {
  // env.jwt.refreshExpiry is a string like "7d" - the JWT itself carries the
  // real expiry; this is only used for the DynamoDB TTL attribute, so we
  // parse the common "Nd" / "Nh" / "Nm" formats used in this project.
  const match = /^(\d+)([dhm])$/.exec(env.jwt.refreshExpiry);
  const now = Date.now();
  if (!match) return Math.floor(now / 1000) + 7 * 24 * 60 * 60; // fallback: 7 days

  const [, amount, unit] = match;
  const multiplier = { d: 86400, h: 3600, m: 60 }[unit];
  return Math.floor(now / 1000) + Number(amount) * multiplier;
}

async function issueTokenPair(user, { userAgent, ip } = {}) {
  const accessToken = generateAccessToken({ userId: user.userId, email: user.email, role: user.role });
  const { token: refreshToken, tokenId } = generateRefreshToken({ userId: user.userId });

  await storeRefreshToken({
    tokenId,
    userId: user.userId,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiryToDate(),
    revoked: false,
    createdAt: new Date().toISOString(),
    userAgent: userAgent || null,
    ip: ip || null,
  });

  return { accessToken, refreshToken };
}

export async function register({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase();

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('An account with this email already exists', HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
  }

  // Only ADMIN or ENGINEER can be requested explicitly by a privileged
  // caller (see auth.controller.js); public self-registration always
  // defaults to VIEWER regardless of what's passed in.
  const assignedRole = Object.values(ROLES).includes(role) ? role : ROLES.VIEWER;

  const now = new Date().toISOString();
  const user = {
    userId: randomUUID(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    name,
    role: assignedRole,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  await createUser(user);
  await logActivity({ userId: user.userId, action: 'ACCOUNT_REGISTERED' });
  authLogger.info('User registered', { userId: user.userId, email: user.email, role: user.role });
  return sanitizeUser(user);
}

export async function login({ email, password, userAgent, ip }) {
  const user = await findUserByEmail(email.toLowerCase());
  if (!user) {
    authLogger.warn('Failed login attempt - unknown email', { email: email.toLowerCase(), ip });
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!user.isActive) {
    authLogger.warn('Login attempt on deactivated account', { userId: user.userId, ip });
    throw new AppError('This account has been deactivated', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    authLogger.warn('Failed login attempt - wrong password', { userId: user.userId, ip });
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const tokens = await issueTokenPair(user, { userAgent, ip });
  await updateUser(user.userId, { lastLoginAt: new Date().toISOString() });
  await logActivity({ userId: user.userId, action: 'LOGIN', ip, userAgent });
  authLogger.info('User logged in', { userId: user.userId, ip, userAgent });

  return { user: sanitizeUser(user), ...tokens };
}

export async function refreshTokens({ refreshToken, userAgent, ip }) {
  const payload = verifyRefreshToken(refreshToken);
  const stored = await findRefreshTokenById(payload.jti);

  if (!stored || stored.revoked || stored.tokenHash !== sha256(refreshToken)) {
    throw new AppError('Refresh token is no longer valid', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  const user = await findUserById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError('Account is no longer active', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  // Rotate: revoke the used refresh token and issue a brand new pair.
  // This limits the blast radius if a refresh token is ever stolen.
  await revokeRefreshToken(payload.jti);
  const tokens = await issueTokenPair(user, { userAgent, ip });
  authLogger.info('Access token refreshed', { userId: user.userId, ip });

  return { user: sanitizeUser(user), ...tokens };
}

export async function logout({ refreshToken }) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefreshToken(payload.jti);
    authLogger.info('User logged out', { userId: payload.sub });
  } catch {
    // Logout is idempotent - an already-invalid/expired token still
    // results in a successful logout from the client's perspective.
  }
}

export async function forgotPassword({ email }) {
  const user = await findUserByEmail(email.toLowerCase());

  // Deliberately do not reveal whether the account exists.
  if (!user) {
    authLogger.info('Password reset requested for unknown email', { email: email.toLowerCase() });
    return;
  }

  const resetToken = generatePasswordResetToken({ userId: user.userId });
  const resetLink = `${env.clientOrigin}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset your IoT Energy Monitoring Platform password',
    text: `Reset your password using this link (valid for 15 minutes): ${resetLink}`,
  });
  authLogger.info('Password reset requested', { userId: user.userId });
}

export async function resetPassword({ token, newPassword }) {
  const payload = verifyPasswordResetToken(token);
  const user = await findUserById(payload.sub);

  if (!user) {
    throw new AppError('Invalid password reset link', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  await updateUser(user.userId, {
    passwordHash: await hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  });

  // Force re-login everywhere - a leaked old session shouldn't survive
  // a password reset.
  await revokeAllRefreshTokensForUser(user.userId);
  authLogger.info('Password reset completed', { userId: user.userId });
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const passwordMatches = await comparePassword(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Current password is incorrect', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }

  await updateUser(user.userId, {
    passwordHash: await hashPassword(newPassword),
    updatedAt: new Date().toISOString(),
  });

  await revokeAllRefreshTokensForUser(user.userId);
  authLogger.info('Password changed', { userId: user.userId });
}

export async function getCurrentUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return sanitizeUser(user);
}
