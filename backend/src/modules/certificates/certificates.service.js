import mongoose from 'mongoose';

import { AppError } from '../../shared/errors/app-error.js';
import { USER_ROLES } from '../../models/user.model.js';
import { INSTITUTION_STATUS } from '../../models/institution.model.js';
import {
  CERTIFICATE_STATUS,
  CERTIFICATE_TYPE,
  VERIFICATION_METHOD,
} from '../../models/certificate.model.js';

function sanitizeCertificate(certificate) {
  if (!certificate) return null;
  const obj = typeof certificate.toObject === 'function' ? certificate.toObject() : { ...certificate };
  delete obj.__v;
  return obj;
}

export class CertificatesService {
  constructor({ certificatesRepository, graduatesRepository, institutionsRepository }) {
    this.certificatesRepository = certificatesRepository;
    this.graduatesRepository = graduatesRepository;
    this.institutionsRepository = institutionsRepository;
  }

  _resolveScope(user) {
    if (!user) {
      throw AppError.unauthorized('Authentication required');
    }
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      return { institutionId: null, isSuperAdmin: true, userId: user._id };
    }
    const institutionId = user.institution?._id ?? user.institution;
    if (!institutionId) {
      throw new AppError({
        message: 'User is not associated with an institution',
        statusCode: 403,
        code: 'NO_INSTITUTION_SCOPE',
      });
    }
    return { institutionId: institutionId.toString(), isSuperAdmin: false, userId: user._id };
  }

  async listCertificates(filters, user) {
    const scope = this._resolveScope(user);
    const result = await this.certificatesRepository.list(filters, scope);
    return {
      ...result,
      items: result.items.map(sanitizeCertificate),
    };
  }

  async getCertificateFiltersMetadata(user) {
    const scope = this._resolveScope(user);
    const [types, statuses] = await Promise.all([
      this.certificatesRepository.listDistinctCertificateTypes(scope.institutionId),
      this.certificatesRepository.listDistinctStatuses(scope.institutionId),
    ]);
    return {
      types: types.length > 0 ? types : Object.values(CERTIFICATE_TYPE),
      statuses: statuses.length > 0 ? statuses : Object.values(CERTIFICATE_STATUS),
      verificationMethods: Object.values(VERIFICATION_METHOD),
    };
  }

  async getCertificate(certificateId, user) {
    if (!mongoose.isValidObjectId(certificateId)) {
      throw AppError.badRequest('Invalid certificate ID');
    }

    const scope = this._resolveScope(user);
    const certificate = await this.certificatesRepository.findById(certificateId, scope);
    if (!certificate) {
      throw AppError.notFound('Certificate not found');
    }

    return {
      certificate: sanitizeCertificate(certificate),
    };
  }

  async getCertificatePreview(certificateId, user) {
    if (!mongoose.isValidObjectId(certificateId)) {
      throw AppError.badRequest('Invalid certificate ID');
    }

    const scope = this._resolveScope(user);
    const certificate = await this.certificatesRepository.findById(certificateId, scope);
    if (!certificate) {
      throw AppError.notFound('Certificate not found');
    }

    const certObj = sanitizeCertificate(certificate);
    const graduate = certObj.graduate
      ? typeof certObj.graduate.toObject === 'function'
        ? certObj.graduate.toObject()
        : { ...certObj.graduate }
      : null;
    const institution = certObj.institution
      ? typeof certObj.institution.toObject === 'function'
        ? certObj.institution.toObject()
        : { ...certObj.institution }
      : null;

    return {
      certificate: certObj,
      preview: {
        certificateNumber: certObj.certificateNumber,
        verificationReference: certObj.verificationReference,
        awardTitle: certObj.awardTitle,
        programme: certObj.programme,
        classification: certObj.classification,
        issueDate: certObj.issueDate,
        expiryDate: certObj.expiryDate ?? null,
        documentUrl: certObj.documentUrl ?? null,
        previewUrl: certObj.previewUrl ?? certObj.thumbnailUrl ?? null,
        thumbnailUrl: certObj.thumbnailUrl ?? null,
        verificationQrCodeUrl: certObj.verificationQrCodeUrl ?? null,
        verificationUrl: certObj.verificationUrl ?? null,
        status: certObj.status,
        type: certObj.type,
      },
      graduate: graduate
        ? {
            firstName: graduate.firstName,
            lastName: graduate.lastName,
            middleName: graduate.middleName ?? null,
            fullName:
              [graduate.firstName, graduate.middleName, graduate.lastName].filter(Boolean).join(' ') ?? null,
            matricNumber: graduate.matricNumber,
            email: graduate.email ?? null,
            programme: graduate.programme ?? null,
            level: graduate.level ?? null,
            graduationYear: graduate.graduationYear ?? null,
            dateOfBirth: graduate.dateOfBirth ?? null,
          }
        : null,
      institution: institution
        ? {
            name: institution.name,
            type: institution.type,
            status: institution.status,
            logoUrl: institution.logoUrl ?? null,
            country: institution.country ?? null,
            city: institution.city ?? null,
            publicContactEmail: institution.publicContactEmail ?? null,
            website: institution.website ?? null,
            verificationPrefix: institution.verificationPrefix ?? null,
          }
        : null,
    };
  }

  async createCertificate(payload, user) {
    const scope = this._resolveScope(user);

    let institutionId = scope.institutionId;
    if (scope.isSuperAdmin && payload.institution) {
      institutionId = payload.institution;
    }

    if (!institutionId) {
      throw AppError.badRequest('Institution is required');
    }

    if (!mongoose.isValidObjectId(institutionId)) {
      throw AppError.badRequest('Invalid institution ID');
    }

    const institution = await this.institutionsRepository.findById(institutionId);
    if (!institution) {
      throw AppError.notFound('Institution not found');
    }

    if (institution.status === INSTITUTION_STATUS.INACTIVE || institution.status === INSTITUTION_STATUS.SUSPENDED) {
      throw new AppError({
        message: 'Cannot create certificates for inactive or suspended institutions',
        statusCode: 400,
        code: 'INSTITUTION_NOT_ACTIVE',
      });
    }

    if (!payload.graduate) {
      throw AppError.badRequest('Graduate is required');
    }

    if (!mongoose.isValidObjectId(payload.graduate)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const graduateScope = { institutionId: scope.isSuperAdmin ? null : institutionId };
    const graduate = await this.graduatesRepository.findById(payload.graduate, graduateScope);
    if (!graduate) {
      throw AppError.notFound('Graduate not found');
    }

    const graduateInstitutionId =
      graduate.institution?._id?.toString() ?? graduate.institution?.toString();
    if (graduateInstitutionId !== institutionId) {
      throw new AppError({
        message: 'Graduate does not belong to this institution',
        statusCode: 400,
        code: 'GRADUATE_INSTITUTION_MISMATCH',
      });
    }

    const duplicateCertNumber = await this.certificatesRepository.existsByCertificateNumber(
      institutionId,
      payload.certificateNumber,
    );
    if (duplicateCertNumber) {
      throw AppError.badRequest('A certificate with this number already exists in the institution');
    }

    if (payload.verificationReference) {
      const duplicateRef = await this.certificatesRepository.existsByVerificationReference(
        payload.verificationReference,
      );
      if (duplicateRef) {
        throw AppError.badRequest('Verification reference is already in use');
      }
    }

    const { institution: _institutionField, graduate: _graduateField, ...data } = payload;
    const certificate = await this.certificatesRepository.create({
      ...data,
      graduate: payload.graduate,
      institution: institutionId,
    });

    return {
      certificate: sanitizeCertificate(certificate),
    };
  }

  async uploadCertificateMetadata(payload, user) {
    const scope = this._resolveScope(user);

    let institutionId = scope.institutionId;
    if (scope.isSuperAdmin && payload.institution) {
      institutionId = payload.institution;
    }

    if (!institutionId) {
      throw AppError.badRequest('Institution is required');
    }

    if (!mongoose.isValidObjectId(institutionId)) {
      throw AppError.badRequest('Invalid institution ID');
    }

    const institution = await this.institutionsRepository.findById(institutionId);
    if (!institution) {
      throw AppError.notFound('Institution not found');
    }

    if (institution.status === INSTITUTION_STATUS.INACTIVE || institution.status === INSTITUTION_STATUS.SUSPENDED) {
      throw new AppError({
        message: 'Cannot upload certificates for inactive or suspended institutions',
        statusCode: 400,
        code: 'INSTITUTION_NOT_ACTIVE',
      });
    }

    let graduateRecord = null;
    if (payload.graduate) {
      if (!mongoose.isValidObjectId(payload.graduate)) {
        throw AppError.badRequest('Invalid graduate ID');
      }
      const graduateScope = { institutionId: scope.isSuperAdmin ? null : institutionId };
      graduateRecord = await this.graduatesRepository.findById(payload.graduate, graduateScope);
      if (!graduateRecord) {
        throw AppError.notFound('Graduate not found');
      }
      const graduateInstitutionId =
        graduateRecord.institution?._id?.toString() ?? graduateRecord.institution?.toString();
      if (graduateInstitutionId !== institutionId) {
        throw new AppError({
          message: 'Graduate does not belong to this institution',
          statusCode: 400,
          code: 'GRADUATE_INSTITUTION_MISMATCH',
        });
      }
    }

    const uploadPayload = {
      ...payload,
      institution: institutionId,
      status: payload.status ?? CERTIFICATE_STATUS.PROCESSING,
    };

    if (graduateRecord) {
      uploadPayload.graduate = payload.graduate;
    }

    return {
      metadata: {
        uploadAccepted: true,
        institutionId,
        suggestedStatus: uploadPayload.status,
        graduateLinked: !!graduateRecord,
        documentMimeType: payload.documentMimeType ?? null,
        documentSize: payload.documentSize ?? null,
        ocrExtractionConfidence: payload.ocrExtractionConfidence ?? null,
      },
    };
  }

  async updateCertificate(certificateId, payload, user) {
    if (!mongoose.isValidObjectId(certificateId)) {
      throw AppError.badRequest('Invalid certificate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.certificatesRepository.findById(certificateId, scope);
    if (!existing) {
      throw AppError.notFound('Certificate not found');
    }

    if (payload.certificateNumber && payload.certificateNumber !== existing.certificateNumber) {
      const instId = scope.institutionId ?? existing.institution?._id ?? existing.institution;
      const duplicate = await this.certificatesRepository.existsByCertificateNumber(
        instId?.toString() ?? instId,
        payload.certificateNumber,
        certificateId,
      );
      if (duplicate) {
        throw AppError.badRequest('A certificate with this number already exists in the institution');
      }
    }

    if (payload.verificationReference && payload.verificationReference !== existing.verificationReference) {
      const duplicateRef = await this.certificatesRepository.existsByVerificationReference(
        payload.verificationReference,
        certificateId,
      );
      if (duplicateRef) {
        throw AppError.badRequest('Verification reference is already in use');
      }
    }

    if (payload.graduate && payload.graduate.toString() !== existing.graduate?._id?.toString()) {
      if (!mongoose.isValidObjectId(payload.graduate)) {
        throw AppError.badRequest('Invalid graduate ID');
      }
      const gradScope = { institutionId: scope.institutionId };
      const newGraduate = await this.graduatesRepository.findById(payload.graduate, gradScope);
      if (!newGraduate) {
        throw AppError.notFound('Graduate not found');
      }
      const newGradInstId =
        newGraduate.institution?._id?.toString() ?? newGraduate.institution?.toString();
      const existingInstId =
        existing.institution?._id?.toString() ?? existing.institution?.toString();
      if (newGradInstId !== existingInstId) {
        throw new AppError({
          message: 'Graduate does not belong to the same institution as the certificate',
          statusCode: 400,
          code: 'GRADUATE_INSTITUTION_MISMATCH',
        });
      }
    }

    const { institution: _if, graduate: _gf, ...updateData } = payload;
    const updated = await this.certificatesRepository.update(certificateId, updateData, scope);
    if (!updated) {
      throw AppError.notFound('Certificate not found');
    }

    return {
      certificate: sanitizeCertificate(updated),
    };
  }

  async publishCertificate(certificateId, user) {
    if (!mongoose.isValidObjectId(certificateId)) {
      throw AppError.badRequest('Invalid certificate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.certificatesRepository.findById(certificateId, scope);
    if (!existing) {
      throw AppError.notFound('Certificate not found');
    }

    if (existing.status === CERTIFICATE_STATUS.PUBLISHED) {
      throw AppError.badRequest('Certificate is already published');
    }

    if (existing.status === CERTIFICATE_STATUS.REVOKED) {
      throw AppError.badRequest('Cannot publish a revoked certificate');
    }

    const published = await this.certificatesRepository.publish(certificateId, scope.userId, scope);
    if (!published) {
      throw AppError.notFound('Certificate not found');
    }

    return {
      certificate: sanitizeCertificate(published),
      previousStatus: existing.status,
      newStatus: CERTIFICATE_STATUS.PUBLISHED,
    };
  }

  async revokeCertificate(certificateId, payload, user) {
    if (!mongoose.isValidObjectId(certificateId)) {
      throw AppError.badRequest('Invalid certificate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.certificatesRepository.findById(certificateId, scope);
    if (!existing) {
      throw AppError.notFound('Certificate not found');
    }

    if (existing.status === CERTIFICATE_STATUS.REVOKED) {
      throw AppError.badRequest('Certificate is already revoked');
    }

    const revoked = await this.certificatesRepository.revoke(
      certificateId,
      scope.userId,
      payload.reason,
      scope,
    );
    if (!revoked) {
      throw AppError.notFound('Certificate not found');
    }

    return {
      certificate: sanitizeCertificate(revoked),
      previousStatus: existing.status,
      newStatus: CERTIFICATE_STATUS.REVOKED,
      reason: payload.reason ?? null,
    };
  }

  async deleteCertificate(certificateId, user) {
    if (!mongoose.isValidObjectId(certificateId)) {
      throw AppError.badRequest('Invalid certificate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.certificatesRepository.findById(certificateId, scope);
    if (!existing) {
      throw AppError.notFound('Certificate not found');
    }

    const removed = await this.certificatesRepository.remove(certificateId, scope);

    return {
      deleted: !!removed,
      certificateId,
      certificateNumber: existing.certificateNumber,
    };
  }

  async listCertificatesByGraduate(graduateId, filters, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);

    const graduateScope = { institutionId: scope.institutionId };
    const graduate = await this.graduatesRepository.findById(graduateId, graduateScope);
    if (!graduate) {
      throw AppError.notFound('Graduate not found');
    }

    const result = await this.certificatesRepository.listByGraduate(graduateId, scope, filters);
    return {
      ...result,
      items: result.items.map(sanitizeCertificate),
    };
  }
}
