import mongoose from 'mongoose';
import { z } from 'zod';

import { AppError } from '../../shared/errors/app-error.js';
import { VERIFICATION_STATUS, VERIFICATION_METHOD } from '../../models/verification-record.model.js';
import { CERTIFICATE_STATUS, Certificate } from '../../models/certificate.model.js';
import { USER_ROLES } from '../../models/user.model.js';
import {
  aggregateScores,
  matchCertificateFields,
  matchGraduateFields,
  matchInstitutionFields,
  idSimilarity,
  nameSimilarity,
} from '../../shared/services/verification-engine.service.js';
import {
  extractStructuredFields,
  normalizeExtractedFields,
  runOcr,
} from '../../shared/services/ocr.service.js';
import { AuditLogger, AUDIT_ACTION, AUDIT_SEVERITY } from '../../shared/services/audit-logger.service.js';
import { CertificatesRepository } from '../certificates/certificates.repository.js';
import { GraduatesRepository } from '../graduates/graduates.repository.js';
import { InstitutionsRepository } from '../institutions/institutions.repository.js';
import { parseQrPayload } from '../../shared/services/qrcode.service.js';
import { verifyCertificate, verifyFromQr } from '../../shared/services/certificate-verification.service.js';
import { logger } from '../../config/logger.js';

const certificatesRepository = new CertificatesRepository();
const graduatesRepository = new GraduatesRepository();
const institutionsRepository = new InstitutionsRepository();

export class VerificationsService {
  constructor({ verificationsRepository }) {
    this.verificationsRepository = verificationsRepository;
  }

  _resolveScope(user) {
    if (!user) return { institutionId: null, isSuperAdmin: false, userId: null };
    const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN;
    const institutionId = isSuperAdmin
      ? null
      : (user.institution?._id ?? user.institution)?.toString() ?? null;
    return { isSuperAdmin, institutionId, userId: user._id };
  }

  async listVerifications(filters, user) {
    const scope = this._resolveScope(user);
    return this.verificationsRepository.list(filters, scope);
  }

  async getVerification(verificationId, user) {
    if (!mongoose.isValidObjectId(verificationId)) throw AppError.badRequest('Invalid verification ID');
    const scope = this._resolveScope(user);
    const result = await this.verificationsRepository.findById(verificationId, scope);
    if (!result) throw AppError.notFound('Verification not found');
    return { verification: result };
  }
  async _recordVerificationEvent({ method, status, certificate, graduate, institution, identifier, identifierType, req }) {
    try {
      const record = await this.verificationsRepository.create({
        method,
        status,
        certificate: certificate || null,
        graduate: graduate || null,
        institution: institution || null,
        requestedFields: { identifier, identifierType },
        verifierIp: req?.ip || req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null,
        verifierUserAgent: req?.headers?.['user-agent'] || null,
      });
      await this.verificationsRepository.markCompleted(record._id, {
        status,
        certificate: certificate || null,
        graduate: graduate || null,
        institution: institution || null,
        confidenceScore: status === 'AUTHENTIC' ? 100 : 0,
        completedAt: new Date(),
      });
      return record;
    } catch (err) {
      logger.warn({ err }, 'Failed to record verification event');
      return null;
    }
  }

  async lookupByReference(reference, req) {
    const result = await verifyCertificate(reference);
    try {
      const cert = await Certificate.findOne({ verificationReference: (reference || '').trim().toUpperCase() })
        .populate('graduate', '_id')
        .populate('institution', '_id')
        .lean();
      if (cert?._id) {
        await certificatesRepository.incrementVerificationCount(cert._id);
        await this._recordVerificationEvent({
          method: 'REFERENCE',
          status: 'AUTHENTIC',
          certificate: cert._id,
          graduate: cert.graduate?._id || null,
          institution: cert.institution?._id || null,
          identifier: reference,
          identifierType: 'VERIFICATION_REFERENCE',
          req,
        });
      }
    } catch (_err) { /* non-fatal */ }
    return result;
  }

  async verifyByNumber(payload, req) {
    const { certificateNumber } = payload;
    const result = await verifyCertificate(certificateNumber);

    try {
      const cert = await Certificate.findOne({
        certificateNumber: certificateNumber.trim().toUpperCase(),
      })
        .populate('graduate', '_id')
        .populate('institution', '_id')
        .lean();
      if (cert?._id) {
        await certificatesRepository.incrementVerificationCount(cert._id);
        await this._recordVerificationEvent({
          method: 'CERTIFICATE_NUMBER',
          status: 'AUTHENTIC',
          certificate: cert._id,
          graduate: cert.graduate?._id || null,
          institution: cert.institution?._id || null,
          identifier: certificateNumber,
          identifierType: 'CERTIFICATE_NUMBER',
          req,
        });
      }
    } catch (_err) { /* non-fatal */ }

    return result;
  }

  async verifyByUpload(payload, _req) {
    const { fileBuffer, mimeType, fileName } = payload;

    if (!fileBuffer || fileBuffer.length === 0) {
      throw AppError.badRequest('No file provided for verification');
    }

    // Run OCR on the uploaded document
    let ocrResult;
    try {
      ocrResult = await runOcr(fileBuffer, { mimeType, fileName });
    } catch (ocrErr) {
      logger.warn({ err: ocrErr }, 'Upload verification OCR failed');
      return {
        verified: false,
        reason: 'OCR_FAILED',
        message: 'OCR processing failed. Please try a clearer image or enter the identifier manually.',
        ocrData: { overallConfidence: 0, charCount: 0, error: ocrErr.message },
      };
    }

    // Use the OCR → verifyCertificate() bridge
    const { identifyCertificateFromOcr } = await import('../../shared/services/ocr.service.js');
    const result = await identifyCertificateFromOcr(ocrResult);

    // Increment verification count and record event on success
    if (result.verified && result.result?.certificate?.verificationReference) {
      try {
        const cert = await Certificate.findOne({
          verificationReference: result.result.certificate.verificationReference,
        })
          .populate('graduate', '_id')
          .populate('institution', '_id')
          .lean();
        if (cert?._id) {
          await certificatesRepository.incrementVerificationCount(cert._id);
          await this._recordVerificationEvent({
            method: 'DOCUMENT_UPLOAD',
            status: 'AUTHENTIC',
            certificate: cert._id,
            graduate: cert.graduate?._id || null,
            institution: cert.institution?._id || null,
            identifier: result.identifier?.value || null,
            identifierType: result.identifier?.type || 'OCR_EXTRACTED',
            req: _req,
          });
        }
      } catch (_err) { /* non-fatal */ }
    }

    return result;
  }

  async verifyByQr(payload, _req) {
    const { qrData, reference } = payload;

    const identifier = reference || qrData;
    if (!identifier) {
      throw AppError.badRequest('QR data or reference is required');
    }

    const result = await verifyFromQr(identifier);

    try {
      const cert = await Certificate.findOne({
        verificationReference: result.certificate?.verificationReference,
      })
        .populate('graduate', '_id')
        .populate('institution', '_id')
        .lean();
      if (cert?._id) {
        await certificatesRepository.incrementVerificationCount(cert._id);
        await this._recordVerificationEvent({
          method: 'QR_CODE',
          status: 'AUTHENTIC',
          certificate: cert._id,
          graduate: cert.graduate?._id || null,
          institution: cert.institution?._id || null,
          identifier: identifier,
          identifierType: 'QR_CODE',
          req: _req,
        });
      }
    } catch (_err) { /* non-fatal */ }

    return result;
  }

  async manualVerify(verificationId, payload, user, req) {
    if (!mongoose.isValidObjectId(verificationId)) throw AppError.badRequest('Invalid verification ID');
    const scope = this._resolveScope(user);
    if (!scope.userId) throw AppError.unauthorized('Authentication required');

    const existing = await this.verificationsRepository.findById(verificationId, scope);
    if (!existing) throw AppError.notFound('Verification record not found');

    const { status, overrideConfidence, verifierNotes, matchedFields, mismatchedFields, missingFields } = payload;
    if (!Object.values(VERIFICATION_STATUS).includes(status)) {
      throw AppError.badRequest(`Invalid status. Allowed: ${Object.values(VERIFICATION_STATUS).join(', ')}`);
    }

    const updated = await this.verificationsRepository.update(
      verificationId,
      {
        status,
        confidenceScore: overrideConfidence !== undefined ? Number(overrideConfidence) : existing.confidenceScore,
        verifier: scope.userId,
        verifierNotes,
        matchedFields: matchedFields || existing.matchedFields,
        mismatchedFields: mismatchedFields || existing.mismatchedFields,
        missingFields: missingFields || existing.missingFields,
        completedAt: new Date(),
      },
      scope,
    );

    void AuditLogger.verification(req, {
      action: AUDIT_ACTION.MANUAL,
      entityId: updated._id,
      entityLabel: updated.verificationReference,
      severity: AUDIT_SEVERITY.MEDIUM,
      previousValues: { status: existing.status, confidenceScore: existing.confidenceScore },
      newValues: { status, confidenceScore: updated?.confidenceScore },
      metadata: { manual: true, verifierNotes },
    });

    return { verification: updated, manuallyOverridden: true };
  }

  async getCertificateVerificationHistory(certificateId, filters, user) {
    if (!mongoose.isValidObjectId(certificateId)) throw AppError.badRequest('Invalid certificate ID');
    const scope = this._resolveScope(user);
    return this.verificationsRepository.listForCertificate(certificateId, scope, filters);
  }

  async getGraduateVerificationHistory(graduateId, filters, user) {
    if (!mongoose.isValidObjectId(graduateId)) throw AppError.badRequest('Invalid graduate ID');
    const scope = this._resolveScope(user);
    return this.verificationsRepository.listForGraduate(graduateId, scope, filters);
  }

  async getMetadata() {
    return {
      statuses: Object.values(VERIFICATION_STATUS),
      methods: Object.values(VERIFICATION_METHOD),
    };
  }

  _buildVerificationResult(record, extras = {}) {
    const result = {
      verification: {
        _id: record._id,
        verificationReference: record.verificationReference,
        method: record.method,
        status: record.status,
        confidenceScore: record.confidenceScore ?? 0,
        certificateMatchScore: record.certificateMatchScore ?? null,
        graduateMatchScore: record.graduateMatchScore ?? null,
        institutionMatchScore: record.institutionMatchScore ?? null,
        matchedFields: record.matchedFields ?? {},
        mismatchedFields: record.mismatchedFields ?? [],
        missingFields: record.missingFields ?? [],
        ocrConfidence: record.ocrConfidence ?? null,
        uploadedDocumentUrl: record.uploadedDocumentUrl ?? null,
        createdAt: record.createdAt,
        completedAt: record.completedAt ?? null,
      },
    };

    if (record.certificate) {
      const c = typeof record.certificate.toObject === 'function' ? record.certificate.toObject() : record.certificate;
      result.certificate = {
        _id: c._id,
        certificateNumber: c.certificateNumber,
        verificationReference: c.verificationReference,
        type: c.type,
        status: c.status,
        awardTitle: c.awardTitle,
        programme: c.programme ?? null,
        classification: c.classification ?? null,
        issueDate: c.issueDate,
        documentUrl: c.documentUrl ?? null,
        verificationQrCodeUrl: c.verificationQrCodeUrl ?? null,
        verificationUrl: c.verificationUrl ?? null,
      };
    }
    if (record.graduate) {
      const g = typeof record.graduate.toObject === 'function' ? record.graduate.toObject() : record.graduate;
      result.graduate = {
        _id: g._id,
        firstName: g.firstName,
        lastName: g.lastName,
        middleName: g.middleName ?? null,
        fullName: [g.firstName, g.middleName, g.lastName].filter(Boolean).join(' '),
        matricNumber: g.matricNumber,
        programme: g.programme ?? null,
      };
    }
    if (record.institution) {
      const i = typeof record.institution.toObject === 'function' ? record.institution.toObject() : record.institution;
      result.institution = {
        _id: i._id,
        name: i.name,
        type: i.type,
        status: i.status,
        logoUrl: i.logoUrl ?? null,
        country: i.country ?? null,
        city: i.city ?? null,
      };
    }

    if (extras.candidates?.length) {
      result.alternatives = extras.candidates.map(({ certificate, overall }) => ({
        certificateId: certificate._id,
        certificateNumber: certificate.certificateNumber,
        confidenceScore: overall.overall,
        status: overall.status,
      }));
    }
    if (extras.ocrText !== undefined) {
      result.ocr = {
        textSummary: extras.ocrText.slice(0, 1000),
        confidence: extras.ocrConfidence ?? 0,
      };
    }
    if (extras.recentVerifications?.length) {
      result.recentVerifications = extras.recentVerifications;
    }

    return result;
  }
}

export const manualVerifySchema = z.object({
  params: z.object({ verificationId: z.string().trim().min(1) }),
  body: z.object({
    status: z.string().trim().min(1),
    overrideConfidence: z.coerce.number().int().min(0).max(100).optional(),
    verifierNotes: z.string().trim().max(1000).optional(),
    matchedFields: z.record(z.unknown()).optional(),
    mismatchedFields: z.array(z.string()).optional(),
    missingFields: z.array(z.string()).optional(),
  }),
});

export const verifyByQrSchema = z.object({
  params: z.object({}).strict(),
  body: z.object({
    qrData: z.string().trim().optional(),
    reference: z.string().trim().optional(),
    fileName: z.string().trim().optional(),
  }).passthrough(),
});

export const manualListSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.string().trim().optional(),
    method: z.string().trim().optional(),
    certificateId: z.string().trim().optional(),
    graduateId: z.string().trim().optional(),
    institutionId: z.string().trim().optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    minConfidence: z.coerce.number().min(0).max(100).optional(),
    maxConfidence: z.coerce.number().min(0).max(100).optional(),
    search: z.string().trim().optional(),
  }),
  body: z.object({}).strict(),
});

export const manualHistorySchema = z.object({
  params: z.object({ id: z.string().trim().min(1) }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  body: z.object({}).strict(),
});
