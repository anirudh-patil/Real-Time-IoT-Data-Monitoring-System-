import * as dashboardService from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getSummary(req.user);
  return sendSuccess(res, { message: 'Dashboard summary fetched successfully', data: summary });
});

export const getPeriodStatistics = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getPeriodStatistics(req.user, req.query.period);
  return sendSuccess(res, { message: 'Dashboard statistics fetched successfully', data: stats });
});
