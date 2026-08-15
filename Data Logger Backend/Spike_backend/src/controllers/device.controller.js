import * as deviceService from '../services/device.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { encodeCursor, decodeCursor } from '../utils/pagination.util.js';

export const registerDevice = asyncHandler(async (req, res) => {
  const { name, firmwareVersion, ownerId } = req.body;
  const device = await deviceService.registerDevice({ name, firmwareVersion, ownerId }, req.user);
  return sendSuccess(res, { statusCode: HTTP_STATUS.CREATED, message: 'Device registered successfully', data: { device } });
});

export const listDevices = asyncHandler(async (req, res) => {
  const { limit, cursor } = req.query;
  const result = await deviceService.listDevices(req.user, {
    limit: limit ? Number(limit) : undefined,
    cursor: decodeCursor(cursor),
  });
  return sendSuccess(res, {
    message: 'Devices fetched successfully',
    data: { items: result.items, nextCursor: encodeCursor(result.nextCursor) },
  });
});

export const getDevice = asyncHandler(async (req, res) => {
  const device = await deviceService.getDevice(req.params.deviceId, req.user);
  return sendSuccess(res, { message: 'Device fetched successfully', data: { device } });
});

export const updateDevice = asyncHandler(async (req, res) => {
  const { name, firmwareVersion } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (firmwareVersion !== undefined) updates.firmwareVersion = firmwareVersion;

  const device = await deviceService.updateDeviceDetails(req.params.deviceId, updates, req.user);
  return sendSuccess(res, { message: 'Device updated successfully', data: { device } });
});

export const deleteDevice = asyncHandler(async (req, res) => {
  await deviceService.deleteDeviceById(req.params.deviceId, req.user);
  return sendSuccess(res, { message: 'Device deleted successfully' });
});

export const getDeviceHealth = asyncHandler(async (req, res) => {
  const health = await deviceService.getDeviceHealth(req.params.deviceId, req.user);
  return sendSuccess(res, { message: 'Device health fetched successfully', data: { health } });
});

/**
 * Manual heartbeat endpoint for ops/testing (Admin/Engineer only - see
 * device.routes.js). The MQTT subscriber (Module 11) will call
 * deviceService.recordDeviceSeen() directly instead of going through HTTP.
 */
export const recordHeartbeat = asyncHandler(async (req, res) => {
  const device = await deviceService.recordDeviceSeen(req.params.deviceId, { firmwareVersion: req.body.firmwareVersion });
  return sendSuccess(res, { message: 'Device heartbeat recorded', data: { device } });
});
