import * as telemetryService from '../services/telemetry.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { encodeCursor, decodeCursor } from '../utils/pagination.util.js';

function parseRangeFilter(req, field) {
  const min = req.query[`${field}Min`];
  const max = req.query[`${field}Max`];
  if (min === undefined && max === undefined) return undefined;
  return {
    ...(min !== undefined ? { min: Number(min) } : {}),
    ...(max !== undefined ? { max: Number(max) } : {}),
  };
}

export const getLatestReading = asyncHandler(async (req, res) => {
  const reading = await telemetryService.getLatestReading(req.params.deviceId, req.user);
  return sendSuccess(res, { message: 'Latest reading fetched successfully', data: { reading } });
});

export const getHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit, cursor, sortOrder } = req.query;

  const filters = {
    voltage: parseRangeFilter(req, 'voltage'),
    current: parseRangeFilter(req, 'current'),
    temperature: parseRangeFilter(req, 'temperature'),
  };

  const result = await telemetryService.getHistory(req.params.deviceId, req.user, {
    startDate,
    endDate,
    limit: limit ? Number(limit) : undefined,
    cursor: decodeCursor(cursor),
    sortOrder,
    filters,
  });

  return sendSuccess(res, {
    message: 'Telemetry history fetched successfully',
    data: { items: result.items, nextCursor: encodeCursor(result.nextCursor) },
  });
});

export const getStatistics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const stats = await telemetryService.getStatistics(req.params.deviceId, req.user, { startDate, endDate });
  return sendSuccess(res, { message: 'Telemetry statistics fetched successfully', data: stats });
});
