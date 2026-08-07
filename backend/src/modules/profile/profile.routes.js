import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  getProfileController,
  updateInstitutionProfileController,
  updateProfilePasswordController,
  updateUserProfileController,
} from './profile.controller.js';
import {
  getProfileSchema,
  updateInstitutionProfileSchema,
  updateProfilePasswordSchema,
  updateUserProfileSchema,
} from './profile.validator.js';

export const profileRoutes = Router();

profileRoutes.get('/', validate(getProfileSchema), asyncHandler(getProfileController));
profileRoutes.patch('/user', validate(updateUserProfileSchema), asyncHandler(updateUserProfileController));
profileRoutes.patch(
  '/institution',
  validate(updateInstitutionProfileSchema),
  asyncHandler(updateInstitutionProfileController),
);
profileRoutes.patch(
  '/password',
  validate(updateProfilePasswordSchema),
  asyncHandler(updateProfilePasswordController),
);
