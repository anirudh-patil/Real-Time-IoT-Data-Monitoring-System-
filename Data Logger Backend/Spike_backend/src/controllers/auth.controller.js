import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ROLES } from '../constants/roles.js';
import { auditLogger } from '../config/logger.config.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Only an authenticated admin may assign a non-default role at signup
  // (e.g. creating an Engineer account). Public/unauthenticated registration
  // always falls back to VIEWER inside the service regardless of `role`.
  const requestedRole = req.user?.role === ROLES.ADMIN ? role : undefined;

  const user = await authService.register({ name, email, password, role: requestedRole });

  if (req.user?.role === ROLES.ADMIN) {
    auditLogger.info('Admin provisioned a new account', { actorId: req.user.userId, targetUserId: user.userId, role: user.role });
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Account created successfully',
    data: { user },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({
    email,
    password,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  return sendSuccess(res, { message: 'Login successful', data: result });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const result = await authService.refreshTokens({
    refreshToken: token,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  return sendSuccess(res, { message: 'Token refreshed successfully', data: result });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  await authService.logout({ refreshToken: token });
  return sendSuccess(res, { message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword({ email });
  return sendSuccess(res, {
    message: 'If an account with that email exists, a password reset link has been sent',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword({ token, newPassword });
  return sendSuccess(res, { message: 'Password has been reset successfully' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword({ userId: req.user.userId, currentPassword, newPassword });
  return sendSuccess(res, { message: 'Password changed successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.userId);
  return sendSuccess(res, { message: 'Current user fetched successfully', data: { user } });
});
