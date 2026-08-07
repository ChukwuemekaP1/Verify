import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { authenticate, requireAnyAdmin } from '../../middlewares/auth.middleware.js';
import {
  buildUploadResponse,
  correctionSchema,
  createCertificateFromUpload,
  processOcrWithUpload,
  processUploadedFile,
  regenerateCertificateQr,
  runOcrOnUpload,
  updateCertificateWithCorrections,
  uploadOcrAndCreateSchema,
  uploadPublic,
  uploadQrScan,
  uploadWithAuth,
} from './uploads.service.js';
import { AuditLogger, AUDIT_ACTION, AUDIT_SEVERITY } from '../../shared/services/audit-logger.service.js';
import { AppError } from '../../shared/errors/app-error.js';

export const uploadsRoutes = Router();

uploadsRoutes.post(
  '/public/verify',
  uploadPublic,
  asyncHandler(processUploadedFile),
  asyncHandler(runOcrOnUpload),
  asyncHandler(async (req, res) => {
    const response = buildUploadResponse(req);
    response.requestedAt = new Date();
    res.status(200).json({ status: 'success', data: response });
  }),
);

uploadsRoutes.post(
  '/public/qr',
  uploadQrScan,
  asyncHandler(processUploadedFile),
  asyncHandler(async (req, res) => {
    res.status(200).json({
      status: 'success',
      data: {
        upload: req.upload,
        message: 'QR image received. Reference extraction requires client-side scanner.',
      },
    });
  }),
);

uploadsRoutes.use(authenticate, requireAnyAdmin);

uploadsRoutes.post(
  '/certificate/ocr',
  uploadWithAuth,
  asyncHandler(processUploadedFile),
  asyncHandler(runOcrOnUpload),
  asyncHandler(async (req, res) => {
    void AuditLogger.certificate(req, {
      action: AUDIT_ACTION.DOCUMENT_UPLOAD,
      entityLabel: req.upload?.fileName,
      severity: AUDIT_SEVERITY.INFO,
      metadata: {
        fileName: req.upload?.fileName,
        size: req.upload?.size,
        mimeType: req.upload?.mimeType,
        ocrConfidence: req.ocr?.overallConfidence || 0,
      },
    });
    res.status(200).json({ status: 'success', data: buildUploadResponse(req) });
  }),
);

uploadsRoutes.post(
  '/certificate/re-ocr/:certificateId',
  uploadWithAuth,
  asyncHandler(processUploadedFile),
  asyncHandler(async (req, res) => {
    const ocr = await processOcrWithUpload(req);
    res.status(200).json({
      status: 'success',
      data: {
        upload: req.upload,
        ocr: {
          rawText: ocr.rawText,
          overallConfidence: ocr.overallConfidence,
          charCount: ocr.charCount,
          wordCount: ocr.wordCount,
          durationMs: ocr.durationMs,
        },
        extractedFields: ocr.extractedFields,
        normalizedFields: ocr.normalized,
      },
    });
  }),
);

uploadsRoutes.post(
  '/certificate/create',
  uploadWithAuth,
  validate(uploadOcrAndCreateSchema),
  asyncHandler(processUploadedFile),
  asyncHandler(runOcrOnUpload),
  asyncHandler(async (req, res) => {
    const ocr = req.ocr || (await processOcrWithUpload(req));
    const payload = req.body || {};
    const correctFields = payload.correctFields || {};

    const cert = await createCertificateFromUpload({
      uploadInfo: req.upload,
      normalizedFields: ocr?.normalized || {},
      payload,
      correctFields,
      graduateId: payload.graduateId,
      createGraduate: payload.createGraduate === true,
      graduate: payload.graduate,
    }, req.user);

    void AuditLogger.certificate(req, {
      action: AUDIT_ACTION.CREATE,
      entityId: cert._id,
      entityLabel: cert.certificateNumber,
      severity: AUDIT_SEVERITY.LOW,
      newValues: {
        certificateNumber: cert.certificateNumber,
        status: cert.status,
        type: cert.type,
        graduate: cert.graduate,
      },
    });

    const certObj = typeof cert.toObject === 'function' ? cert.toObject() : cert;

    res.status(201).json({
      status: 'success',
      data: {
        certificate: certObj,
        upload: req.upload,
        ocrSummary: ocr
          ? {
              confidence: ocr.overallConfidence,
              charCount: ocr.charCount,
              wordCount: ocr.wordCount,
            }
          : null,
      },
    });
  }),
);

uploadsRoutes.patch(
  '/certificate/:certificateId/correct',
  validate(correctionSchema),
  asyncHandler(async (req, res, next) => {
    const hasFile = req.headers['content-type']?.includes('multipart/form-data');
    if (hasFile) {
      uploadWithAuth(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    } else {
      next();
    }
  }),
  asyncHandler(async (req, res, next) => {
    if (req.file && !req.upload) {
      try {
        await new Promise((resolve, reject) => processUploadedFile(req, res, (err) => (err ? reject(err) : resolve())));
      } catch (err) {
        throw AppError.badRequest(err.message || 'Upload processing failed');
      }
    }
    next();
  }),
  asyncHandler(async (req, res) => {
    const updated = await updateCertificateWithCorrections(
      req.params.certificateId,
      { ...(req.body || {}), uploadInfo: req.upload },
      req.user,
      req,
    );

    const updObj = typeof updated.toObject === 'function' ? updated.toObject() : updated;

    res.status(200).json({
      status: 'success',
      data: {
        certificate: updObj,
        changesApplied: Object.keys(req.body?.correctFields || req.body || {}).length,
      },
    });
  }),
);

uploadsRoutes.post(
  '/certificate/:certificateId/qr/regenerate',
  asyncHandler(async (req, res) => {
    const cert = await regenerateCertificateQr(req.params.certificateId, req.user);
    void AuditLogger.certificate(req, {
      action: AUDIT_ACTION.QR_GENERATE,
      entityId: req.params.certificateId,
      entityLabel: cert?.certificateNumber,
      severity: AUDIT_SEVERITY.INFO,
    });
    const certObj = typeof cert.toObject === 'function' ? cert.toObject() : cert;
    res.status(200).json({
      status: 'success',
      data: { certificate: certObj },
    });
  }),
);

uploadsRoutes.post(
  '/document',
  uploadWithAuth,
  asyncHandler(processUploadedFile),
  asyncHandler(async (req, res) => {
    res.status(200).json({ status: 'success', data: { upload: req.upload } });
  }),
);
