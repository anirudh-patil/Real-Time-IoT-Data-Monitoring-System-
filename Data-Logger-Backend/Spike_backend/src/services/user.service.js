import { randomUUID } from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  findUserById,
  updateUser,
  deleteUser as deleteUserRecord,
  listUsers as listUsersRecords,
} from '../repositories/user.repository.js';
import { revokeAllRefreshTokensForUser } from '../repositories/refreshToken.repository.js';
import { logActivity, getActivityHistory as getActivityHistoryRecords } from '../repositories/activityLog.repository.js';
import { s3Client, profileImagesBucket } from '../config/s3.config.js';
import { env } from '../config/env.config.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { auditLogger } from '../config/logger.config.js';

function sanitizeUser(user) {
  if (!user) return null;
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

async function requireUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
  return user;
}

// --- Self-service profile ---

export async function getProfile(userId) {
  return sanitizeUser(await requireUser(userId));
}

export async function updateProfile(userId, { name }, meta = {}) {
  await requireUser(userId);
  const updated = await updateUser(userId, { name, updatedAt: new Date().toISOString() });
  await logActivity({ userId, action: 'PROFILE_UPDATED', metadata: { name }, ...meta });
  return sanitizeUser(updated);
}

export async function uploadProfileImage(userId, file, meta = {}) {
  await requireUser(userId);

  const extension = file.mimetype.split('/')[1];
  const key = `profile-images/${userId}/${randomUUID()}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: profileImagesBucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const imageUrl = `https://${profileImagesBucket}.s3.${env.aws.region}.amazonaws.com/${key}`;

  const updated = await updateUser(userId, {
    profileImageUrl: imageUrl,
    profileImageKey: key,
    updatedAt: new Date().toISOString(),
  });

  await logActivity({ userId, action: 'PROFILE_IMAGE_UPDATED', metadata: { key }, ...meta });
  return sanitizeUser(updated);
}

export async function deactivateOwnAccount(userId, meta = {}) {
  await requireUser(userId);
  await updateUser(userId, { isActive: false, updatedAt: new Date().toISOString() });
  await revokeAllRefreshTokensForUser(userId);
  await logActivity({ userId, action: 'ACCOUNT_DEACTIVATED', ...meta });
}

export async function deleteOwnAccount(userId, meta = {}) {
  const user = await requireUser(userId);
  await revokeAllRefreshTokensForUser(userId);

  if (user.profileImageKey) {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: profileImagesBucket, Key: user.profileImageKey })
    ).catch(() => {
      // Best-effort cleanup - a stray S3 object shouldn't block account deletion.
    });
  }

  await logActivity({ userId, action: 'ACCOUNT_DELETED', ...meta });
  await deleteUserRecord(userId);
}

export async function getActivityHistory(userId, options) {
  await requireUser(userId);
  return getActivityHistoryRecords(userId, options);
}

// --- Admin CRUD ---

export async function listUsers(options) {
  const { items, nextCursor } = await listUsersRecords(options);
  return { items: items.map(sanitizeUser), nextCursor };
}

export async function getUserById(userId) {
  return sanitizeUser(await requireUser(userId));
}

export async function adminUpdateUser(userId, updates, meta = {}) {
  await requireUser(userId);
  const updated = await updateUser(userId, { ...updates, updatedAt: new Date().toISOString() });

  // A role change or deactivation should kill existing sessions immediately.
  if ('role' in updates || updates.isActive === false) {
    await revokeAllRefreshTokensForUser(userId);
  }

  await logActivity({ userId, action: 'ADMIN_UPDATED_USER', metadata: updates, ...meta });
  auditLogger.info('Admin updated user', { actorId: meta.actorId, targetUserId: userId, changes: updates, ip: meta.ip });
  return sanitizeUser(updated);
}

export async function adminDeleteUser(userId, meta = {}) {
  const user = await requireUser(userId);
  await revokeAllRefreshTokensForUser(userId);

  if (user.profileImageKey) {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: profileImagesBucket, Key: user.profileImageKey })
    ).catch(() => {});
  }

  await logActivity({ userId, action: 'ADMIN_DELETED_USER', ...meta });
  auditLogger.info('Admin deleted user', { actorId: meta.actorId, targetUserId: userId, ip: meta.ip });
  await deleteUserRecord(userId);
}
