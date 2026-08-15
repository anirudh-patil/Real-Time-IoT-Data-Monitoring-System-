import * as userService from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { encodeCursor, decodeCursor } from '../utils/pagination.util.js';

function requestMeta(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'], actorId: req.user?.userId };
}

// --- Self-service ---

export const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.userId);
  return sendSuccess(res, { message: 'Profile fetched successfully', data: { user } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.userId, { name: req.body.name }, requestMeta(req));
  return sendSuccess(res, { message: 'Profile updated successfully', data: { user } });
});

export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('An image file is required', HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR);
  }
  const user = await userService.uploadProfileImage(req.user.userId, req.file, requestMeta(req));
  return sendSuccess(res, { message: 'Profile image updated successfully', data: { user } });
});

export const deactivateOwnAccount = asyncHandler(async (req, res) => {
  await userService.deactivateOwnAccount(req.user.userId, requestMeta(req));
  return sendSuccess(res, { message: 'Account deactivated successfully' });
});

export const deleteOwnAccount = asyncHandler(async (req, res) => {
  await userService.deleteOwnAccount(req.user.userId, requestMeta(req));
  return sendSuccess(res, { message: 'Account deleted successfully' });
});

export const getOwnActivity = asyncHandler(async (req, res) => {
  const activity = await userService.getActivityHistory(req.user.userId, { limit: Number(req.query.limit) || 50 });
  return sendSuccess(res, { message: 'Activity history fetched successfully', data: { activity } });
});

// --- Admin CRUD ---

export const listUsers = asyncHandler(async (req, res) => {
  const { limit, cursor } = req.query;
  const result = await userService.listUsers({
    limit: limit ? Number(limit) : undefined,
    cursor: decodeCursor(cursor),
  });
  return sendSuccess(res, {
    message: 'Users fetched successfully',
    data: { items: result.items, nextCursor: encodeCursor(result.nextCursor) },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  return sendSuccess(res, { message: 'User fetched successfully', data: { user } });
});

export const adminUpdateUser = asyncHandler(async (req, res) => {
  const { name, role, isActive } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;

  const user = await userService.adminUpdateUser(req.params.userId, updates, requestMeta(req));
  return sendSuccess(res, { message: 'User updated successfully', data: { user } });
});

export const adminDeleteUser = asyncHandler(async (req, res) => {
  await userService.adminDeleteUser(req.params.userId, requestMeta(req));
  return sendSuccess(res, { message: 'User deleted successfully' });
});

export const getUserActivity = asyncHandler(async (req, res) => {
  const activity = await userService.getActivityHistory(req.params.userId, { limit: Number(req.query.limit) || 50 });
  return sendSuccess(res, { message: 'Activity history fetched successfully', data: { activity } });
});
