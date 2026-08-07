import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { authenticate, requireAnyAdmin } from '../../middlewares/auth.middleware.js';
import {
  getCertificateVerificationHistoryController,
  getGraduateVerificationHistoryController,
  getVerificationController,
  getVerificationMetadataController,
  listVerificationsController,
  lookupByReferenceController,
  manualVerifyController,
  verifyByNumberController,
  verifyByQrController,
  verifyByUploadController,
} from './verifications.controller.js';
import {
  referenceLookupSchema,
  verificationDetailSchema,
  verifyByNumberSchema,
} from './verifications.validator.js';
import { uploadPublic, uploadQrScan, processUploadedFile } from '../uploads/uploads.service.js';
import {
  manualHistorySchema,
  manualListSchema,
  manualVerifySchema,
  verifyByQrSchema,
} from './verifications.service.js';

export const verificationsRoutes = Router();

verificationsRoutes.get(
  '/metadata',
  asyncHandler(getVerificationMetadataController),
);

verificationsRoutes.get(
  '/reference/:reference',
  validate(referenceLookupSchema),
  asyncHandler(lookupByReferenceController),
);

verificationsRoutes.post(
  '/public/number',
  validate(verifyByNumberSchema),
  asyncHandler(verifyByNumberController),
);

verificationsRoutes.post(
  '/public/upload',
  uploadPublic,
  asyncHandler(processUploadedFile),
  asyncHandler(verifyByUploadController),
);

verificationsRoutes.post(
  '/public/qr',
  uploadQrScan,
  asyncHandler(processUploadedFile),
  validate(verifyByQrSchema),
  asyncHandler(verifyByQrController),
);

verificationsRoutes.use(authenticate, requireAnyAdmin);

verificationsRoutes.get(
  '/',
  validate(manualListSchema),
  asyncHandler(listVerificationsController),
);

verificationsRoutes.get(
  '/:verificationId',
  validate(verificationDetailSchema),
  asyncHandler(getVerificationController),
);

verificationsRoutes.patch(
  '/:verificationId/manual',
  validate(manualVerifySchema),
  asyncHandler(manualVerifyController),
);

verificationsRoutes.get(
  '/certificate/:certificateId',
  validate(manualHistorySchema),
  asyncHandler(getCertificateVerificationHistoryController),
);

verificationsRoutes.get(
  '/graduate/:graduateId',
  validate(manualHistorySchema),
  asyncHandler(getGraduateVerificationHistoryController),
);
