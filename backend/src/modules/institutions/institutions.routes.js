import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  authenticate,
  requireSuperAdmin,
  requireAnyAdmin,
} from '../../middlewares/auth.middleware.js';
import {
  createInstitutionController,
  deleteInstitutionController,
  getInstitutionController,
  listInstitutionsController,
  updateInstitutionController,
  updateInstitutionStatusController,
} from './institutions.controller.js';
import {
  createInstitutionSchema,
  deleteInstitutionSchema,
  institutionDetailSchema,
  listInstitutionsSchema,
  updateInstitutionSchema,
  updateInstitutionStatusSchema,
} from './institutions.validator.js';

export const institutionsRoutes = Router();

institutionsRoutes.use(authenticate);

institutionsRoutes.get(
  '/',
  requireAnyAdmin,
  validate(listInstitutionsSchema),
  asyncHandler(listInstitutionsController),
);
institutionsRoutes.post(
  '/',
  requireSuperAdmin,
  validate(createInstitutionSchema),
  asyncHandler(createInstitutionController),
);
institutionsRoutes.get(
  '/:institutionId',
  requireAnyAdmin,
  validate(institutionDetailSchema),
  asyncHandler(getInstitutionController),
);
institutionsRoutes.patch(
  '/:institutionId',
  requireSuperAdmin,
  validate(updateInstitutionSchema),
  asyncHandler(updateInstitutionController),
);
institutionsRoutes.patch(
  '/:institutionId/status',
  requireSuperAdmin,
  validate(updateInstitutionStatusSchema),
  asyncHandler(updateInstitutionStatusController),
);
institutionsRoutes.delete(
  '/:institutionId',
  requireSuperAdmin,
  validate(deleteInstitutionSchema),
  asyncHandler(deleteInstitutionController),
);
