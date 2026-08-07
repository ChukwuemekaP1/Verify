import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import {
  authenticate,
  requireAnyAdmin,
  requireInstitutionScope,
} from '../../middlewares/auth.middleware.js';
import {
  createCertificateController,
  deleteCertificateController,
  getCertificateController,
  getCertificateFiltersMetadataController,
  getCertificatePreviewController,
  listCertificatesByGraduateController,
  listCertificatesController,
  publishCertificateController,
  revokeCertificateController,
  updateCertificateController,
  uploadCertificateMetadataController,
} from './certificates.controller.js';
import {
  certificateDetailSchema,
  createCertificateSchema,
  deleteCertificateSchema,
  graduateCertificatesSchema,
  listCertificatesSchema,
  publishCertificateSchema,
  revokeCertificateSchema,
  updateCertificateSchema,
  uploadCertificateMetadataSchema,
} from './certificates.validator.js';

export const certificatesRoutes = Router();

certificatesRoutes.use(authenticate, requireAnyAdmin, requireInstitutionScope);

certificatesRoutes.get(
  '/',
  validate(listCertificatesSchema),
  asyncHandler(listCertificatesController),
);
certificatesRoutes.get(
  '/filters/metadata',
  asyncHandler(getCertificateFiltersMetadataController),
);
certificatesRoutes.post(
  '/',
  validate(createCertificateSchema),
  asyncHandler(createCertificateController),
);
certificatesRoutes.post(
  '/upload/metadata',
  validate(uploadCertificateMetadataSchema),
  asyncHandler(uploadCertificateMetadataController),
);
certificatesRoutes.get(
  '/graduate/:graduateId',
  validate(graduateCertificatesSchema),
  asyncHandler(listCertificatesByGraduateController),
);
certificatesRoutes.get(
  '/:certificateId',
  validate(certificateDetailSchema),
  asyncHandler(getCertificateController),
);
certificatesRoutes.get(
  '/:certificateId/preview',
  validate(certificateDetailSchema),
  asyncHandler(getCertificatePreviewController),
);
certificatesRoutes.patch(
  '/:certificateId',
  validate(updateCertificateSchema),
  asyncHandler(updateCertificateController),
);
certificatesRoutes.patch(
  '/:certificateId/publish',
  validate(publishCertificateSchema),
  asyncHandler(publishCertificateController),
);
certificatesRoutes.patch(
  '/:certificateId/revoke',
  validate(revokeCertificateSchema),
  asyncHandler(revokeCertificateController),
);
certificatesRoutes.delete(
  '/:certificateId',
  validate(deleteCertificateSchema),
  asyncHandler(deleteCertificateController),
);
