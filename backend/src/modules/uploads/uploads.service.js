import { z } from 'zod';
import multer from 'multer';
import { AppError } from '../../shared/errors/app-error.js';
import {
  configureCloudinary,
  createUploadMiddleware,
  uploadToCloudinary,
  deleteFromCloudinary,
  extractCloudinaryPublicId,
  isCloudinaryConfigured,
} from '../../shared/services/cloudinary.service.js';
import {
  runOcr,
  extractStructuredFields,
  splitFullName,
  parseOcrDate,
  parseGraduationYear,
  normalizeClassification,
  normalizeCertificateType,
} from '../../shared/services/ocr.service.js';
import { CERTIFICATE_STATUS, VERIFICATION_METHOD } from '../../models/certificate.model.js';
import { USER_ROLES } from '../../models/user.model.js';
import { AuditLogger, AUDIT_ACTION, AUDIT_SEVERITY } from '../../shared/services/audit-logger.service.js';
import { generateQrCodeFile } from '../../shared/services/qrcode.service.js';
import { CertificatesRepository } from '../certificates/certificates.repository.js';
import { GraduatesRepository } from '../graduates/graduates.repository.js';
import { InstitutionsRepository } from '../institutions/institutions.repository.js';
import { logger } from '../../config/logger.js';

const certificatesRepository = new CertificatesRepository();
const graduatesRepository = new GraduatesRepository();
const institutionsRepository = new InstitutionsRepository();

configureCloudinary();

const uploadMiddleware = createUploadMiddleware({
  maxSizeMb: 10,
  fieldName: 'file',
  folder: 'veriflow/uploads',
  allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
});

const uploadMiddlewarePublic = createUploadMiddleware({
  maxSizeMb: 10,
  fieldName: 'file',
  folder: 'veriflow/public-verifications',
  allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
});

const qrUploadMiddleware = createUploadMiddleware({
  maxSizeMb: 5,
  fieldName: 'file',
  folder: 'veriflow/qr-scans',
  allowedMimes: ['image/jpeg', 'image/jpg', 'image/png'],
});

export function handleMulterError(fn) {
  return (req, res, next) => {
    fn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(AppError.badRequest(`Upload error: ${err.code} - ${err.message}`));
      }
      if (err) {
        const msg = err.message || 'File upload failed';
        if (/timeout|timed?\s?out/i.test(msg) || /LIMIT_/.test(err.code || '')) {
          return next(AppError.badRequest(msg));
        }
        return next(AppError.badRequest(msg));
      }
      next();
    });
  };
}

export const uploadWithAuth = handleMulterError(uploadMiddleware);
export const uploadPublic = handleMulterError(uploadMiddlewarePublic);
export const uploadQrScan = handleMulterError(qrUploadMiddleware);

export async function processUploadedFile(req, _res, next) {
  if (!req.file) {
    return next(AppError.badRequest('No file uploaded'));
  }
  try {
    let buffer;
    let mimeType = req.file.mimetype;
    let fileName = req.file.originalname || 'upload';
    let documentUrl = req.file.path || null;
    let cloudinaryId = req.file.filename || null;
    let documentSize = req.file.size;

    if (req.file.buffer) {
      buffer = req.file.buffer;
      try {
        const uploaded = await uploadToCloudinary(buffer, {
          folder: 'veriflow/uploads',
          resource_type: 'auto',
          format: undefined,
        });
        documentUrl = uploaded.secure_url || documentUrl;
        cloudinaryId = uploaded.public_id || cloudinaryId;
        documentSize = uploaded.bytes || buffer.length;
      } catch (_cloudErr) {
        documentUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    } else if (req.file.path && !isCloudinaryConfigured()) {
      buffer = Buffer.from(req.file.path);
    }

    req.upload = {
      fileName,
      mimeType,
      size: documentSize,
      buffer,
      documentUrl,
      cloudinaryId,
    };

    next();
  } catch (err) {
    next(AppError.badRequest(err.message || 'File processing failed'));
  }
}

export async function runOcrOnUpload(req, _res, next) {
  if (!req.upload?.buffer && !req.upload?.documentUrl) {
    return next();
  }
  try {
    const buffer = req.upload.buffer || Buffer.from(
      req.upload.documentUrl.startsWith('data:')
        ? req.upload.documentUrl.split(',')[1]
        : '',
      'base64',
    );
    if (!buffer || buffer.length === 0) return next();

    const ocrResult = await runOcr(buffer, {
      mimeType: req.upload.mimeType,
      fileName: req.upload.fileName,
    });

    const extractedFields = extractStructuredFields(ocrResult.text, ocrResult.lines);

    const normalized = normalizeExtractedFields(extractedFields);

    req.ocr = {
      rawText: ocrResult.text,
      words: ocrResult.words,
      lines: ocrResult.lines,
      overallConfidence: ocrResult.overallConfidence,
      charCount: ocrResult.charCount,
      wordCount: ocrResult.wordCount,
      durationMs: ocrResult.durationMs,
      isPdf: ocrResult.isPdf,
      extractedFields: extractedFields,
      normalized,
    };

    next();
  } catch (err) {
    logger.warn({ err }, 'OCR processing failed; continuing without OCR data');
    req.ocr = {
      rawText: '',
      words: [],
      lines: [],
      overallConfidence: 0,
      charCount: 0,
      wordCount: 0,
      durationMs: 0,
      isPdf: false,
      extractedFields: {},
      normalized: {},
      error: err.message,
    };
    next();
  }
}

export function normalizeExtractedFields(fields) {
  if (!fields) return {};
  const result = { ...fields };
  if (fields.FULL_NAME) {
    const { firstName, middleName, lastName } = splitFullName(fields.FULL_NAME);
    result.firstName = firstName;
    result.lastName = lastName;
    if (middleName) result.middleName = middleName;
  }
  if (fields.ISSUE_DATE) result.issueDate = parseOcrDate(fields.ISSUE_DATE);
  if (fields.EXPIRY_DATE) result.expiryDate = parseOcrDate(fields.EXPIRY_DATE);
  if (fields.GRADUATION_YEAR) result.graduationYear = parseGraduationYear(fields.GRADUATION_YEAR);
  if (fields.CLASSIFICATION) result.classification = normalizeClassification(fields.CLASSIFICATION);
  if (fields.CERTIFICATE_TYPE) {
    const ct = normalizeCertificateType(fields.CERTIFICATE_TYPE) || normalizeCertificateType(fields.AWARD_TITLE);
    if (ct) result.certificateType = ct;
  }
  if (fields.CERTIFICATE_NUMBER) {
    result.certificateNumber = String(fields.CERTIFICATE_NUMBER).trim().replace(/\s+/g, ' ');
  }
  if (fields.MATRIC_NUMBER) {
    result.matricNumber = String(fields.MATRIC_NUMBER).trim().replace(/\s+/g, ' ');
  }
  if (fields.AWARD_TITLE) result.awardTitle = String(fields.AWARD_TITLE).trim().replace(/\s+/g, ' ');
  if (fields.PROGRAMME) result.programme = String(fields.PROGRAMME).trim().replace(/\s+/g, ' ');
  if (fields.INSTITUTION) result.institutionName = String(fields.INSTITUTION).trim().replace(/\s+/g, ' ');
  return result;
}

export function buildUploadResponse(req) {
  return {
    upload: {
      fileName: req.upload.fileName,
      mimeType: req.upload.mimeType,
      size: req.upload.size,
      documentUrl: req.upload.documentUrl,
      cloudinaryId: req.upload.cloudinaryId,
    },
    ocr: req.ocr
      ? {
          rawText: req.ocr.rawText,
          overallConfidence: req.ocr.overallConfidence,
          charCount: req.ocr.charCount,
          wordCount: req.ocr.wordCount,
          durationMs: req.ocr.durationMs,
          isPdf: req.ocr.isPdf,
        }
      : null,
    extractedFields: req.ocr?.extractedFields || {},
    normalizedFields: req.ocr?.normalized || {},
    suggestedStatus: CERTIFICATE_STATUS.PENDING_REVIEW,
  };
}

export async function processOcrWithUpload(req) {
  const { buffer, mimeType, fileName } = req.upload;
  const ocrResult = await runOcr(buffer, { mimeType, fileName });
  const extractedFields = extractStructuredFields(ocrResult.text, ocrResult.lines);
  const normalized = normalizeExtractedFields(extractedFields);
  return {
    rawText: ocrResult.text,
    words: ocrResult.words,
    lines: ocrResult.lines,
    overallConfidence: ocrResult.overallConfidence,
    charCount: ocrResult.charCount,
    wordCount: ocrResult.wordCount,
    durationMs: ocrResult.durationMs,
    isPdf: ocrResult.isPdf,
    extractedFields,
    normalized,
  };
}

export async function createCertificateFromUpload(data, user) {
  const scope = _resolveScope(user);
  const institutionId = scope.institutionId;
  if (!institutionId && !scope.isSuperAdmin) {
    throw AppError.badRequest('User not associated with an institution');
  }

  const {
    graduate,
    graduateId,
    createGraduate = false,
    normalizedFields,
    uploadInfo,
    payload,
    correctFields = {},
  } = data;

  let finalInstitutionId = institutionId;
  if (scope.isSuperAdmin && payload.institution) finalInstitutionId = payload.institution;
  if (!finalInstitutionId) throw AppError.badRequest('Institution is required');

  const institution = await institutionsRepository.findById(finalInstitutionId);
  if (!institution) throw AppError.notFound('Institution not found');

  let finalGraduateId = graduateId;
  if (!finalGraduateId && createGraduate && graduate) {
    const grad = await graduatesRepository.create({
      ...graduate,
      institution: finalInstitutionId,
    });
    finalGraduateId = grad._id;
  }
  if (!finalGraduateId) {
    throw AppError.badRequest('Graduate is required');
  }

  const finalFields = { ...(normalizedFields || {}), ...(correctFields || {}) };
  const certPayload = {
    certificateNumber: finalFields.certificateNumber || payload.certificateNumber,
    type: finalFields.certificateType || payload.type || 'CERTIFICATE',
    status: payload.status || CERTIFICATE_STATUS.PENDING_REVIEW,
    issueDate: finalFields.issueDate || payload.issueDate,
    expiryDate: finalFields.expiryDate || payload.expiryDate || undefined,
    awardTitle: finalFields.awardTitle || payload.awardTitle,
    programme: finalFields.programme || payload.programme || undefined,
    classification: finalFields.classification || payload.classification || undefined,
    honours: finalFields.honours || payload.honours || undefined,
    gpa: finalFields.gpa || payload.gpa || undefined,
    graduate: finalGraduateId,
    institution: finalInstitutionId,
    documentUrl: uploadInfo?.documentUrl || payload.documentUrl || undefined,
    documentMimeType: uploadInfo?.mimeType || payload.documentMimeType || undefined,
    documentSize: uploadInfo?.size || payload.documentSize || undefined,
    ocrExtractionConfidence: payload.ocrExtractionConfidence,
    ocrFieldsCorrected: Object.keys(correctFields || {}).length || 0,
    ocrReviewedBy: scope.userId,
    ocrReviewedAt: new Date(),
    metadata: payload.metadata || undefined,
    notes: payload.notes || undefined,
  };

  if (payload.verificationReference) {
    certPayload.verificationReference = payload.verificationReference;
  }

  const cert = await certificatesRepository.create(certPayload);

  if (payload.publishNow) {
    await certificatesRepository.publish(cert._id, scope.userId, scope);
  }

  let qrResult = null;
  const publishedOrVerify =
    cert.status === CERTIFICATE_STATUS.PUBLISHED ||
    cert.verificationMethod === VERIFICATION_METHOD.BOTH ||
    cert.verificationMethod === VERIFICATION_METHOD.QR;
  if (publishedOrVerify) {
    try {
      qrResult = await generateQrCodeFile(cert.verificationReference, {
        certificateNumber: cert.certificateNumber,
        institutionName: institution?.name,
      });
      if (qrResult) {
        await certificatesRepository.update(cert._id, {
          verificationQrCodeUrl: qrResult.qrCodeUrl,
          verificationQrData: qrResult.qrPayload,
          verificationUrl: qrResult.verificationUrl,
        }, scope);
      }
    } catch (qrErr) {
      logger.warn({ err: qrErr, certificateId: cert._id }, 'Failed to generate QR code');
    }
  }

  return cert;
}

export async function updateCertificateWithCorrections(certificateId, data, user, req) {
  const scope = _resolveScope(user);
  const existing = await certificatesRepository.findById(certificateId, scope);
  if (!existing) throw AppError.notFound('Certificate not found');

  const previous = existing.toObject ? existing.toObject() : { ...existing };
  const {
    correctFields = {},
    uploadInfo,
    ocrConfidence,
    notes,
    ...updateData
  } = data;

  const finalUpdate = { ...updateData, ...correctFields };
  if (Object.keys(correctFields).length > 0) {
    finalUpdate.ocrFieldsCorrected = (existing.ocrFieldsCorrected || 0) + Object.keys(correctFields).length;
    finalUpdate.ocrReviewedBy = scope.userId;
    finalUpdate.ocrReviewedAt = new Date();
  }
  if (ocrConfidence !== undefined && ocrConfidence !== null) {
    finalUpdate.ocrExtractionConfidence = ocrConfidence;
  }
  if (uploadInfo?.documentUrl) {
    finalUpdate.documentUrl = uploadInfo.documentUrl;
    finalUpdate.documentMimeType = uploadInfo.mimeType || existing.documentMimeType;
    finalUpdate.documentSize = uploadInfo.size || existing.documentSize;
  }
  if (notes !== undefined) finalUpdate.notes = notes;

  const updated = await certificatesRepository.update(certificateId, finalUpdate, scope);

  if (req) {
    void AuditLogger.certificate(req, {
      action: AUDIT_ACTION.CORRECT,
      entityId: certificateId,
      entityLabel: updated.certificateNumber,
      severity: AUDIT_SEVERITY.LOW,
      previousValues: {
        ocrFieldsCorrected: previous.ocrFieldsCorrected,
        ...correctFields,
      },
      newValues: {
        ocrFieldsCorrected: finalUpdate.ocrFieldsCorrected,
        ...correctFields,
      },
    });
  }

  return updated;
}

export async function regenerateCertificateQr(certificateId, user) {
  const scope = _resolveScope(user);
  const cert = await certificatesRepository.findById(certificateId, scope);
  if (!cert) throw AppError.notFound('Certificate not found');

  const institution = cert.institution && (cert.institution.name ? cert.institution : await institutionsRepository.findById(cert.institution));
  const qr = await generateQrCodeFile(cert.verificationReference, {
    certificateNumber: cert.certificateNumber,
    institutionName: institution?.name,
  });

  return certificatesRepository.update(certificateId, {
    verificationQrCodeUrl: qr.qrCodeUrl,
    verificationQrData: qr.qrPayload,
    verificationUrl: qr.verificationUrl,
  }, scope);
}

function _resolveScope(user) {
  if (!user) throw AppError.unauthorized('Authentication required');
  if (user.role === USER_ROLES.SUPER_ADMIN) return { institutionId: null, isSuperAdmin: true, userId: user._id };
  const institutionId = user.institution?._id ?? user.institution;
  return {
    institutionId: institutionId?.toString() ?? null,
    isSuperAdmin: false,
    userId: user._id,
  };
}

export const uploadOcrAndCreateSchema = z.object({
  body: z.object({
    type: z.string().trim().optional(),
    status: z.string().trim().optional(),
    issueDate: z.union([z.string().trim(), z.date()]).optional(),
    expiryDate: z.union([z.string().trim(), z.date()]).optional(),
    awardTitle: z.string().trim().optional(),
    programme: z.string().trim().optional(),
    classification: z.string().trim().optional(),
    honours: z.string().trim().optional(),
    gpa: z.string().trim().optional(),
    graduateId: z.string().trim().optional(),
    createGraduate: z.boolean().optional(),
    graduate: z.record(z.unknown()).optional(),
    institution: z.string().trim().optional(),
    verificationReference: z.string().trim().optional(),
    notes: z.string().trim().max(2000).optional(),
    publishNow: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
    correctFields: z.record(z.unknown()).optional(),
  }).passthrough(),
});

export const correctionSchema = z.object({
  body: z.object({
    certificateNumber: z.string().trim().optional(),
    type: z.string().trim().optional(),
    issueDate: z.union([z.string().trim(), z.date()]).optional(),
    expiryDate: z.union([z.string().trim(), z.date()]).optional(),
    awardTitle: z.string().trim().optional(),
    programme: z.string().trim().optional(),
    classification: z.string().trim().optional(),
    honours: z.string().trim().optional(),
    gpa: z.string().trim().optional(),
    graduate: z.string().trim().optional(),
    correctFields: z.record(z.unknown()).optional(),
    notes: z.string().trim().max(2000).optional(),
    status: z.string().trim().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).passthrough(),
});
