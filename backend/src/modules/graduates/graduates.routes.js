import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  authenticate,
  requireAnyAdmin,
  requireInstitutionScope,
} from '../../middlewares/auth.middleware.js';
import {
  archiveGraduateController,
  createGraduateController,
  deleteGraduateController,
  getGraduateController,
  getGraduateFiltersMetadataController,
  getGraduateProfileController,
  listGraduatesController,
  unarchiveGraduateController,
  updateGraduateController,
} from './graduates.controller.js';
import {
  archiveGraduateSchema,
  createGraduateSchema,
  deleteGraduateSchema,
  graduateDetailSchema,
  listGraduatesSchema,
  unarchiveGraduateSchema,
  updateGraduateSchema,
} from './graduates.validator.js';

export const graduatesRoutes = Router();

graduatesRoutes.use(authenticate, requireAnyAdmin, requireInstitutionScope);

graduatesRoutes.get(
  '/',
  validate(listGraduatesSchema),
  asyncHandler(listGraduatesController),
);
graduatesRoutes.get(
  '/filters/metadata',
  asyncHandler(getGraduateFiltersMetadataController),
);
graduatesRoutes.post(
  '/',
  validate(createGraduateSchema),
  asyncHandler(createGraduateController),
);
graduatesRoutes.get(
  '/:graduateId',
  validate(graduateDetailSchema),
  asyncHandler(getGraduateController),
);
graduatesRoutes.get(
  '/:graduateId/profile',
  validate(graduateDetailSchema),
  asyncHandler(getGraduateProfileController),
);
graduatesRoutes.patch(
  '/:graduateId',
  validate(updateGraduateSchema),
  asyncHandler(updateGraduateController),
);
graduatesRoutes.patch(
  '/:graduateId/archive',
  validate(archiveGraduateSchema),
  asyncHandler(archiveGraduateController),
);
graduatesRoutes.patch(
  '/:graduateId/unarchive',
  validate(unarchiveGraduateSchema),
  asyncHandler(unarchiveGraduateController),
);
graduatesRoutes.delete(
  '/:graduateId',
  validate(deleteGraduateSchema),
  asyncHandler(deleteGraduateController),
);
