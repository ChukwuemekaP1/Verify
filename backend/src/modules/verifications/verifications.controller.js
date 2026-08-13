import { VerificationsRepository } from './verifications.repository.js';
import {
  VerificationsService,
  manualHistorySchema,
  manualListSchema,
  manualVerifySchema,
  verifyByQrSchema,
} from './verifications.service.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { USER_ROLES } from '../../models/user.model.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { handleMulterError, uploadPublic, uploadQrScan, uploadWithAuth, processUploadedFile } from '../uploads/uploads.service.js';
import { verifyCertificate, verifyFromQr } from '../../shared/services/certificate-verification.service.js';

const verificationsService = new VerificationsService({
  verificationsRepository: new VerificationsRepository(),
});

export async function listVerificationsController(req, res) {
  const result = await verificationsService.listVerifications(req.query, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getVerificationController(req, res) {
  const result = await verificationsService.getVerification(req.params.verificationId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function lookupByReferenceController(req, res) {
  const result = await verificationsService.lookupByReference(req.params.reference, req);
  res.status(200).json({ status: 'success', data: result });
}

export async function verifyByNumberController(req, res) {
  const result = await verificationsService.verifyByNumber(req.body, req);
  res.status(200).json({ status: 'success', data: result });
}

export async function verifyByUploadController(req, res) {
  const payload = {
    ...(req.body || {}),
    fileBuffer: req.upload?.buffer,
    mimeType: req.upload?.mimeType,
    fileName: req.upload?.fileName,
    documentUrl: req.upload?.documentUrl,
    cloudinaryId: req.upload?.cloudinaryId,
  };
  const result = await verificationsService.verifyByUpload(payload, req);
  res.status(200).json({ status: 'success', data: result });
}

export async function verifyByQrController(req, res) {
  const payload = {
    ...(req.body || {}),
    qrImageBuffer: req.upload?.buffer,
  };
  const result = await verificationsService.verifyByQr(payload, req);
  res.status(200).json({ status: 'success', data: result });
}

export async function manualVerifyController(req, res) {
  const result = await verificationsService.manualVerify(
    req.params.verificationId,
    req.body,
    req.user,
    req,
  );
  res.status(200).json({ status: 'success', data: result });
}

export async function getCertificateVerificationHistoryController(req, res) {
  const result = await verificationsService.getCertificateVerificationHistory(
    req.params.certificateId,
    req.query,
    req.user,
  );
  res.status(200).json({ status: 'success', data: result });
}

export async function getGraduateVerificationHistoryController(req, res) {
  const result = await verificationsService.getGraduateVerificationHistory(
    req.params.graduateId,
    req.query,
    req.user,
  );
  res.status(200).json({ status: 'success', data: result });
}

export async function getVerificationMetadataController(_req, res) {
  const result = await verificationsService.getMetadata();
  res.status(200).json({ status: 'success', data: result });
}

export async function verifyPublicController(req, res) {
  const { identifier } = req.body;
  try {
    const result = await verifyCertificate(identifier);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    if (err.statusCode === 404) {
      // Record the NOT_FOUND event for activity tracking
      try {
        const { VerificationsRepository } = await import('./verifications.repository.js');
        const repo = new VerificationsRepository();
        const record = await repo.create({
          method: 'REFERENCE',
          status: 'NOT_FOUND',
          requestedFields: { identifier },
          verifierIp: req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null,
          verifierUserAgent: req?.headers?.['user-agent'] || null,
        });
        await repo.markCompleted(record._id, {
          status: 'NOT_FOUND',
          confidenceScore: 0,
          completedAt: new Date(),
        });
      } catch (_recErr) { /* non-fatal */ }
    }
    throw err;
  }
}
