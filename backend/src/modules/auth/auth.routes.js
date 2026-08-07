import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate, requireSuperAdmin } from '../../middlewares/auth.middleware.js';
import {
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
  resetPasswordController,
  seedSuperAdminController,
} from './auth.controller.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  seedSuperAdminSchema,
} from './auth.validator.js';

export const authRoutes = Router();

authRoutes.post('/login', validate(loginSchema), asyncHandler(loginController));
authRoutes.post('/refresh', asyncHandler(refreshController));
authRoutes.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordController),
);
authRoutes.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordController),
);
authRoutes.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(changePasswordController),
);
authRoutes.get('/me', authenticate, asyncHandler(meController));
authRoutes.post('/logout', authenticate, asyncHandler(logoutController));
authRoutes.post(
  '/seed-super-admin',
  authenticate,
  requireSuperAdmin,
  validate(seedSuperAdminSchema),
  asyncHandler(seedSuperAdminController),
);
