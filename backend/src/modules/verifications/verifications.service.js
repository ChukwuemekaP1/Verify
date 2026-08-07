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

  async lookupByReference(reference) {
    const ref = (reference || '').trim().toUpperCase();
    if (!ref) throw AppError.badRequest('Reference is required');

    const { certificate, verifications } = await this.verificationsRepository.findByCertificateRef(ref);

    if (certificate) {
      const isPublic = certificate.status === CERTIFICATE_STATUS.PUBLISHED;
      if (!isPublic) {
        throw AppError.notFound('Certificate reference not found');
      }
      const preview = await certificatesRepository.findById(certificate._id, {}) || certificate;
      const graduate = preview.graduate || null;
      const institution = preview.institution || null;

      return {
        verified: true,
        lookupMethod: 'CERTIFICATE_REFERENCE',
        certificate: {
          _id: certificate._id,
          certificateNumber: certificate.certificateNumber,
          verificationReference: certificate.verificationReference,
          type: certificate.type,
          status: certificate.status,
          awardTitle: certificate.awardTitle,
          programme: certificate.programme,
          classification: certificate.classification,
          issueDate: certificate.issueDate,
          expiryDate: certificate.expiryDate ?? null,
          documentUrl: certificate.documentUrl ?? null,
          thumbnailUrl: certificate.thumbnailUrl ?? null,
          previewUrl: certificate.previewUrl ?? null,
          verificationQrCodeUrl: certificate.verificationQrCodeUrl ?? null,
          verificationUrl: certificate.verificationUrl ?? null,
          publishedAt: certificate.publishedAt ?? null,
          verificationCount: certificate.verificationCount ?? 0,
        },
        graduate: graduate
          ? {
              firstName: graduate.firstName,
              lastName: graduate.lastName,
              middleName: graduate.middleName ?? null,
              fullName: [graduate.firstName, graduate.middleName, graduate.lastName].filter(Boolean).join(' '),
              matricNumber: graduate.matricNumber,
              programme: graduate.programme ?? null,
              level: graduate.level ?? null,
              graduationYear: graduate.graduationYear ?? null,
            }
          : null,
        institution: institution
          ? {
              _id: institution._id,
              name: institution.name,
              type: institution.type,
              status: institution.status,
              verificationPrefix: institution.verificationPrefix ?? null,
              logoUrl: institution.logoUrl ?? null,
              country: institution.country ?? null,
              city: institution.city ?? null,
              website: institution.website ?? null,
              publicContactEmail: institution.publicContactEmail ?? null,
            }
          : null,
        recentVerifications: verifications.slice(0, 10),
        lookedUpAt: new Date(),
      };
    }

    const directRef = await this.verificationsRepository.findByVerificationReference(ref);
    if (directRef) {
      return {
        verified: true,
        lookupMethod: 'VERIFICATION_RECORD_REFERENCE',
        verificationId: directRef._id,
        verificationReference: directRef.verificationReference,
        status: directRef.status,
        confidenceScore: directRef.confidenceScore ?? null,
        completedAt: directRef.completedAt ?? null,
        createdAt: directRef.createdAt,
      };
    }

    throw AppError.notFound('No record found for this reference');
  }

  async verifyByNumber(payload, req) {
    const scope = this._resolveScope(req?.user);
    const { certificateNumber, surname, matricNumber, institutionId, awardTitle, programme } = payload;

    const auditMeta = { certificateNumber, surname, matricNumber, institutionId };

    const record = await this.verificationsRepository.create({
      method: VERIFICATION_METHOD.CERTIFICATE_NUMBER,
      status: VERIFICATION_STATUS.IN_PROGRESS,
      requestedFields: payload,
      institution: institutionId || null,
      verifier: scope.userId || null,
      verifierIp:
        req?.ip ||
        req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        null,
      verifierUserAgent: req?.headers?.['user-agent'] || null,
    });

    const candidates = await this.verificationsRepository.findCandidateCertificates({
      certificateNumber,
      surname,
      matricNumber,
      institutionId,
      awardTitle,
      programme,
    });

    if (!candidates || candidates.length === 0) {
      const final = await this.verificationsRepository.markCompleted(record._id, {
        status: VERIFICATION_STATUS.NOT_FOUND,
        confidenceScore: 0,
        mismatchedFields: ['certificateNumber'],
        missingFields: [],
      });
      void AuditLogger.verification(req, {
        action: AUDIT_ACTION.VERIFY,
        entityId: final._id,
        entityLabel: final.verificationReference,
        severity: AUDIT_SEVERITY.MEDIUM,
        previousValues: { status: VERIFICATION_STATUS.IN_PROGRESS },
        newValues: { status: VERIFICATION_STATUS.NOT_FOUND },
        metadata: auditMeta,
      });
      return this._buildVerificationResult(final, { candidates: [] });
    }

    const extractedForMatching = {
      certificateNumber,
      awardTitle,
      programme,
      FIRST_NAME: payload.firstName,
      LAST_NAME: surname,
      FULL_NAME: [payload.firstName, surname].filter(Boolean).join(' '),
      MATRIC_NUMBER: matricNumber,
    };

    const ranked = candidates
      .map((c) => {
        const certResult = matchCertificateFields(c, extractedForMatching);
        const gradResult = matchGraduateFields(c.graduate || {}, extractedForMatching);
        const instResult = matchInstitutionFields(c.institution || {}, extractedForMatching);
        const aggregate = aggregateScores({
          certificate: certResult.score,
          graduate: gradResult.score,
          institution: instResult.score,
        });
        return {
          certificate: c,
          graduate: c.graduate,
          institution: c.institution,
          certificateMatch: certResult,
          graduateMatch: gradResult,
          institutionMatch: instResult,
          overall: aggregate,
        };
      })
      .sort((a, b) => b.overall.overall - a.overall.overall);

    const best = ranked[0];
    const certificateId = best.certificate._id;
    const graduateId = best.graduate?._id || null;
    const institutionIdFinal = best.institution?._id || null;

    const final = await this.verificationsRepository.markCompleted(record._id, {
      status: best.overall.status,
      certificate: certificateId,
      graduate: graduateId,
      institution: institutionIdFinal,
      confidenceScore: best.overall.overall,
      certificateMatchScore: best.certificateMatch.score,
      graduateMatchScore: best.graduateMatch.score,
      institutionMatchScore: best.institutionMatch.score,
      matchedFields: {
        certificate: best.certificateMatch.matchedFields,
        graduate: best.graduateMatch.matchedFields,
        institution: best.institutionMatch.matchedFields,
      },
      mismatchedFields: [
        ...(best.certificateMatch.mismatchedFields || []),
        ...(best.graduateMatch.mismatchedFields || []),
        ...(best.institutionMatch.mismatchedFields || []),
      ],
      missingFields: [
        ...(best.certificateMatch.missingFields || []),
        ...(best.graduateMatch.missingFields || []),
        ...(best.institutionMatch.missingFields || []),
      ],
      metadata: {
        candidatesConsidered: ranked.length,
        breakdown: best.overall.breakdown,
      },
    });

    if (best.overall.status === VERIFICATION_STATUS.AUTHENTIC) {
      try {
        await certificatesRepository.incrementVerificationCount(certificateId);
      } catch (_err) {
        // ignore
      }
    }

    const severity =
      best.overall.status === VERIFICATION_STATUS.AUTHENTIC
        ? AUDIT_SEVERITY.INFO
        : best.overall.status === VERIFICATION_STATUS.SUSPICIOUS
          ? AUDIT_SEVERITY.MEDIUM
          : AUDIT_SEVERITY.HIGH;

    void AuditLogger.verification(req, {
      action: AUDIT_ACTION.VERIFY,
      entityId: final._id,
      entityLabel: final.verificationReference,
      severity,
      previousValues: { status: VERIFICATION_STATUS.IN_PROGRESS },
      newValues: {
        status: final.status,
        confidenceScore: final.confidenceScore,
        certificate: certificateId,
      },
      metadata: auditMeta,
    });

    return this._buildVerificationResult(final, {
      candidates: ranked.slice(0, 5),
      best,
    });
  }

  async verifyByUpload(payload, req) {
    const scope = this._resolveScope(req?.user);
    const { fileBuffer, mimeType, fileName, documentUrl, cloudinaryId, surname, matricNumber, institutionId } = payload;

    let ocrText = '';
    let ocrConfidence = 0;
    let extractedFields = {};
    let normalized = {};

    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const ocr = await runOcr(fileBuffer, { mimeType, fileName });
        ocrText = ocr.text;
        ocrConfidence = ocr.overallConfidence;
        extractedFields = extractStructuredFields(ocrText, ocr.lines);
        normalized = normalizeExtractedFields(extractedFields);
      } catch (ocrErr) {
        logger.warn({ err: ocrErr }, 'Upload verification OCR failed');
      }
    }

    const auditMeta = { fileName, size: fileBuffer?.length || 0, ocrConfidence };

    const record = await this.verificationsRepository.create({
      method: VERIFICATION_METHOD.DOCUMENT_UPLOAD,
      status: VERIFICATION_STATUS.IN_PROGRESS,
      requestedFields: {
        surname,
        matricNumber,
        institutionId,
        ...normalized,
      },
      institution: institutionId || null,
      verifier: scope.userId || null,
      verifierIp:
        req?.ip ||
        req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        null,
      verifierUserAgent: req?.headers?.['user-agent'] || null,
      ocrText,
      ocrConfidence,
      uploadedDocumentUrl: documentUrl,
      uploadedDocumentCloudinaryId: cloudinaryId,
    });

    const mergedFields = {
      ...(extractedFields || {}),
      certificateNumber: normalized.certificateNumber || extractedFields.CERTIFICATE_NUMBER,
      awardTitle: normalized.awardTitle || extractedFields.AWARD_TITLE,
      programme: normalized.programme || extractedFields.PROGRAMME,
      MATRIC_NUMBER: normalized.matricNumber || matricNumber || extractedFields.MATRIC_NUMBER,
      FIRST_NAME: normalized.firstName || extractedFields.FIRST_NAME,
      LAST_NAME: normalized.lastName || surname || extractedFields.LAST_NAME,
      FULL_NAME: [normalized.firstName, normalized.middleName, normalized.lastName].filter(Boolean).join(' ') || extractedFields.FULL_NAME,
      ISSUE_DATE: normalized.issueDate || extractedFields.ISSUE_DATE,
      CLASSIFICATION: normalized.classification || extractedFields.CLASSIFICATION,
      GPA: normalized.gpa || extractedFields.GPA,
      HONOURS: normalized.honours || extractedFields.HONOURS,
      INSTITUTION: normalized.institutionName || extractedFields.INSTITUTION,
    };

    const candidates = await this.verificationsRepository.findCandidateCertificates({
      certificateNumber: mergedFields.certificateNumber,
      surname: mergedFields.LAST_NAME,
      matricNumber: mergedFields.MATRIC_NUMBER,
      institutionId,
      awardTitle: mergedFields.awardTitle,
      programme: mergedFields.programme,
    });

    if (!candidates || candidates.length === 0) {
      const final = await this.verificationsRepository.markCompleted(record._id, {
        status: VERIFICATION_STATUS.NOT_FOUND,
        confidenceScore: 0,
        mismatchedFields: ['certificateNumber'],
        missingFields: [],
      });
      void AuditLogger.verification(req, {
        action: AUDIT_ACTION.VERIFY,
        entityId: final._id,
        entityLabel: final.verificationReference,
        severity: AUDIT_SEVERITY.MEDIUM,
        previousValues: { status: VERIFICATION_STATUS.IN_PROGRESS },
        newValues: { status: VERIFICATION_STATUS.NOT_FOUND },
        metadata: auditMeta,
      });
      return this._buildVerificationResult(final, { candidates: [], ocrText, ocrConfidence });
    }

    const ranked = candidates
      .map((c) => {
        const certResult = matchCertificateFields(c, mergedFields);
        const gradResult = matchGraduateFields(c.graduate || {}, mergedFields);
        const instResult = matchInstitutionFields(c.institution || {}, mergedFields);
        const aggregate = aggregateScores({
          certificate: certResult.score,
          graduate: gradResult.score,
          institution: instResult.score,
        });
        return {
          certificate: c,
          graduate: c.graduate,
          institution: c.institution,
          certificateMatch: certResult,
          graduateMatch: gradResult,
          institutionMatch: instResult,
          overall: aggregate,
        };
      })
      .sort((a, b) => b.overall.overall - a.overall.overall);

    const best = ranked[0];
    const certificateId = best.certificate._id;
    const graduateId = best.graduate?._id || null;
    const institutionIdFinal = best.institution?._id || null;

    const final = await this.verificationsRepository.markCompleted(record._id, {
      status: best.overall.status,
      certificate: certificateId,
      graduate: graduateId,
      institution: institutionIdFinal,
      confidenceScore: best.overall.overall,
      certificateMatchScore: best.certificateMatch.score,
      graduateMatchScore: best.graduateMatch.score,
      institutionMatchScore: best.institutionMatch.score,
      matchedFields: {
        certificate: best.certificateMatch.matchedFields,
        graduate: best.graduateMatch.matchedFields,
        institution: best.institutionMatch.matchedFields,
      },
      mismatchedFields: [
        ...(best.certificateMatch.mismatchedFields || []),
        ...(best.graduateMatch.mismatchedFields || []),
        ...(best.institutionMatch.mismatchedFields || []),
      ],
      missingFields: [
        ...(best.certificateMatch.missingFields || []),
        ...(best.graduateMatch.missingFields || []),
        ...(best.institutionMatch.missingFields || []),
      ],
      metadata: {
        candidatesConsidered: ranked.length,
        breakdown: best.overall.breakdown,
        ocrUsed: !!ocrText,
      },
    });

    if (best.overall.status === VERIFICATION_STATUS.AUTHENTIC) {
      try {
        await certificatesRepository.incrementVerificationCount(certificateId);
      } catch (_err) {
        // ignore
      }
    }

    const severity =
      best.overall.status === VERIFICATION_STATUS.AUTHENTIC
        ? AUDIT_SEVERITY.INFO
        : best.overall.status === VERIFICATION_STATUS.SUSPICIOUS
          ? AUDIT_SEVERITY.MEDIUM
          : AUDIT_SEVERITY.HIGH;

    void AuditLogger.verification(req, {
      action: AUDIT_ACTION.VERIFY,
      entityId: final._id,
      entityLabel: final.verificationReference,
      severity,
      previousValues: { status: VERIFICATION_STATUS.IN_PROGRESS },
      newValues: {
        status: final.status,
        confidenceScore: final.confidenceScore,
        certificate: certificateId,
      },
      metadata: auditMeta,
    });

    return this._buildVerificationResult(final, {
      candidates: ranked.slice(0, 5),
      best,
      ocrText,
      ocrConfidence,
    });
  }

  async verifyByQr(payload, req) {
    const scope = this._resolveScope(req?.user);
    const { qrData, qrImageBuffer, reference } = payload;

    let parsedRef = reference;

    if (!parsedRef && qrData) {
      const parsed = parseQrPayload(qrData);
      if (parsed.ok && parsed.data?.ref) {
        parsedRef = parsed.data.ref;
      } else if (typeof qrData === 'string') {
        const m = qrData.match(/[?&]ref=([A-Za-z0-9_-]+)/);
        if (m) parsedRef = decodeURIComponent(m[1]);
      }
    }

    if (!parsedRef && qrImageBuffer?.length > 0) {
      try {
        const ocr = await runOcr(qrImageBuffer, { mimeType: 'image/png', fileName: 'qr.png' });
        const allText = ocr.text || '';
        const m = allText.match(/(V[A-Z0-9]{8,}|REF[:\s\-]*([A-Z0-9\-]{4,}))/i);
        if (m) parsedRef = (m[2] || m[1]).toUpperCase();
      } catch (_ocrErr) {
        // ignore
      }
    }

    const auditMeta = { qrProvided: !!qrData, reference: parsedRef, imageProvided: !!qrImageBuffer };

    const record = await this.verificationsRepository.create({
      method: VERIFICATION_METHOD.QR_CODE,
      status: VERIFICATION_STATUS.IN_PROGRESS,
      requestedFields: { qrReference: parsedRef, qrData },
      verifier: scope.userId || null,
      verifierIp:
        req?.ip ||
        req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
        null,
      verifierUserAgent: req?.headers?.['user-agent'] || null,
    });

    if (!parsedRef) {
      const final = await this.verificationsRepository.markCompleted(record._id, {
        status: VERIFICATION_STATUS.ERROR,
        confidenceScore: 0,
        mismatchedFields: ['qrReference'],
      });
      void AuditLogger.verification(req, {
        action: AUDIT_ACTION.VERIFY,
        entityId: final._id,
        entityLabel: final.verificationReference,
        severity: AUDIT_SEVERITY.MEDIUM,
        errorMessage: 'Could not extract QR reference',
        metadata: auditMeta,
      });
      return this._buildVerificationResult(final, { qrError: 'Could not extract reference from QR data' });
    }

    const { certificate, verifications } = await this.verificationsRepository.findByCertificateRef(parsedRef.toUpperCase());

    if (!certificate) {
      const final = await this.verificationsRepository.markCompleted(record._id, {
        status: VERIFICATION_STATUS.NOT_FOUND,
        confidenceScore: 0,
      });
      void AuditLogger.verification(req, {
        action: AUDIT_ACTION.VERIFY,
        entityId: final._id,
        entityLabel: final.verificationReference,
        severity: AUDIT_SEVERITY.MEDIUM,
        metadata: auditMeta,
      });
      return this._buildVerificationResult(final, {});
    }

    if (certificate.status !== CERTIFICATE_STATUS.PUBLISHED) {
      const final = await this.verificationsRepository.markCompleted(record._id, {
        status: VERIFICATION_STATUS.NOT_FOUND,
        certificate: certificate._id,
        confidenceScore: 10,
      });
      return this._buildVerificationResult(final, {});
    }

    const final = await this.verificationsRepository.markCompleted(record._id, {
      status: VERIFICATION_STATUS.AUTHENTIC,
      certificate: certificate._id,
      graduate: certificate.graduate || null,
      institution: certificate.institution || null,
      confidenceScore: 100,
      certificateMatchScore: 100,
      graduateMatchScore: 100,
      institutionMatchScore: 100,
      matchedFields: { qr: [{ extracted: parsedRef, stored: certificate.verificationReference, similarity: 100 }] },
    });

    try {
      await certificatesRepository.incrementVerificationCount(certificate._id);
    } catch (_err) {
      // ignore
    }

    void AuditLogger.verification(req, {
      action: AUDIT_ACTION.VERIFY,
      entityId: final._id,
      entityLabel: final.verificationReference,
      severity: AUDIT_SEVERITY.INFO,
      previousValues: { status: VERIFICATION_STATUS.IN_PROGRESS },
      newValues: {
        status: VERIFICATION_STATUS.AUTHENTIC,
        certificate: certificate._id,
      },
      metadata: auditMeta,
    });

    return this._buildVerificationResult(final, { recentVerifications: verifications });
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
