import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { USER_ROLES } from '../../models/user.model.js';
import {
  getDashboardController,
  getPublicStatisticsController,
  getSystemStatisticsController,
} from './analytics.controller.js';
import { systemStatsSchema } from './analytics.service.js';

export const analyticsRoutes = Router();

analyticsRoutes.get('/public/stats', asyncHandler(getPublicStatisticsController));

analyticsRoutes.use(authenticate);

analyticsRoutes.get('/dashboard', asyncHandler(getDashboardController));
analyticsRoutes.get(
  '/system',
  validate(systemStatsSchema),
  requireRole(USER_ROLES.SUPER_ADMIN),
  asyncHandler(getSystemStatisticsController),
);
