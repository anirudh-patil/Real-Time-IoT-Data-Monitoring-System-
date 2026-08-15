import * as alertService from '../services/alert.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { encodeCursor, decodeCursor } from '../utils/pagination.util.js';

export const getAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.getAlert(req.params.alertId, req.user);
  return sendSuccess(res, { message: 'Alert fetched successfully', data: { alert } });
});

export const listAlertsForDevice = asyncHandler(async (req, res) => {
  const { limit, cursor, status } = req.query;
  const result = await alertService.listAlertsForDevice(req.params.deviceId, req.user, {
    limit: limit ? Number(limit) : undefined,
    cursor: decodeCursor(cursor),
    status,
  });
  return sendSuccess(res, {
    message: 'Device alert history fetched successfully',
    data: { items: result.items, nextCursor: encodeCursor(result.nextCursor) },
  });
});

export const resolveAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.resolveAlertManually(req.params.alertId, req.user);
  return sendSuccess(res, { message: 'Alert resolved successfully', data: { alert } });
});
