import mongoose from 'mongoose';

import { AppError } from '../../shared/errors/app-error.js';
import { USER_ROLES } from '../../models/user.model.js';
import { INSTITUTION_STATUS } from '../../models/institution.model.js';
import { GRADUATE_STATUS, GRADUATE_LEVEL } from '../../models/graduate.model.js';

function sanitizeGraduate(graduate) {
  if (!graduate) return null;
  const obj = typeof graduate.toObject === 'function' ? graduate.toObject() : { ...graduate };
  delete obj.__v;
  return obj;
}

export class GraduatesService {
  constructor({ graduatesRepository, institutionsRepository, certificatesRepository }) {
    this.graduatesRepository = graduatesRepository;
    this.institutionsRepository = institutionsRepository;
    this.certificatesRepository = certificatesRepository;
  }

  _resolveScope(user) {
    if (!user) {
      throw AppError.unauthorized('Authentication required');
    }
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      return { institutionId: null, isSuperAdmin: true };
    }
    const institutionId = user.institution?._id ?? user.institution;
    if (!institutionId) {
      throw new AppError({
        message: 'User is not associated with an institution',
        statusCode: 403,
        code: 'NO_INSTITUTION_SCOPE',
      });
    }
    return { institutionId: institutionId.toString(), isSuperAdmin: false };
  }

  async listGraduates(filters, user) {
    const scope = this._resolveScope(user);
    const result = await this.graduatesRepository.list(filters, scope);
    return {
      ...result,
      items: result.items.map(sanitizeGraduate),
    };
  }

  async getGraduateFiltersMetadata(user) {
    const scope = this._resolveScope(user);
    const [graduationYears, programmes] = await Promise.all([
      this.graduatesRepository.listDistinctGraduationYears(scope.institutionId),
      this.graduatesRepository.listDistinctProgrammes(scope.institutionId),
    ]);
    return {
      graduationYears,
      programmes,
      levels: Object.values(GRADUATE_LEVEL),
      statuses: Object.values(GRADUATE_STATUS),
    };
  }

  async getGraduate(graduateId, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);
    const graduate = await this.graduatesRepository.findById(graduateId, scope);
    if (!graduate) {
      throw AppError.notFound('Graduate not found');
    }

    return {
      graduate: sanitizeGraduate(graduate),
    };
  }

  async getGraduateProfile(graduateId, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);
    const graduate = await this.graduatesRepository.findById(graduateId, scope);
    if (!graduate) {
      throw AppError.notFound('Graduate not found');
    }

    let certificates = [];
    if (this.certificatesRepository) {
      try {
        const certResult = await this.certificatesRepository.list(
          { page: 1, limit: 100, graduateId: graduateId },
          scope,
        );
        certificates = certResult.items;
      } catch {
        certificates = [];
      }
    }

    const certificateCount =
      graduate.certificateCount ??
      (typeof graduate.certificateCount === 'number' ? graduate.certificateCount : certificates.length);

    return {
      graduate: sanitizeGraduate(graduate),
      certificateCount,
      certificates: certificates.map((c) => {
        const obj = typeof c.toObject === 'function' ? c.toObject() : { ...c };
        delete obj.__v;
        return obj;
      }),
    };
  }

  async createGraduate(payload, user) {
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
        message: 'Cannot create graduate records for inactive or suspended institutions',
        statusCode: 400,
        code: 'INSTITUTION_NOT_ACTIVE',
      });
    }

    const duplicate = await this.graduatesRepository.existsByMatricNumber(
      institutionId,
      payload.matricNumber,
    );
    if (duplicate) {
      throw AppError.badRequest('A graduate with this matriculation number already exists in the institution');
    }

    const { institution: _institutionField, ...data } = payload;
    const graduate = await this.graduatesRepository.create({
      ...data,
      institution: institutionId,
    });

    return {
      graduate: sanitizeGraduate(graduate),
    };
  }

  async updateGraduate(graduateId, payload, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.graduatesRepository.findById(graduateId, scope);
    if (!existing) {
      throw AppError.notFound('Graduate not found');
    }

    if (payload.matricNumber && payload.matricNumber !== existing.matricNumber) {
      const instId = scope.institutionId ?? existing.institution?._id ?? existing.institution;
      const duplicate = await this.graduatesRepository.existsByMatricNumber(
        instId?.toString() ?? instId,
        payload.matricNumber,
        graduateId,
      );
      if (duplicate) {
        throw AppError.badRequest('A graduate with this matriculation number already exists in the institution');
      }
    }

    const updated = await this.graduatesRepository.update(graduateId, payload, scope);
    if (!updated) {
      throw AppError.notFound('Graduate not found');
    }

    return {
      graduate: sanitizeGraduate(updated),
    };
  }

  async archiveGraduate(graduateId, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.graduatesRepository.findById(graduateId, scope);
    if (!existing) {
      throw AppError.notFound('Graduate not found');
    }

    if (existing.status === GRADUATE_STATUS.ARCHIVED) {
      throw AppError.badRequest('Graduate is already archived');
    }

    const archived = await this.graduatesRepository.archive(graduateId, scope);
    if (!archived) {
      throw AppError.notFound('Graduate not found');
    }

    return {
      graduate: sanitizeGraduate(archived),
      previousStatus: existing.status,
      newStatus: GRADUATE_STATUS.ARCHIVED,
    };
  }

  async unarchiveGraduate(graduateId, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.graduatesRepository.findById(graduateId, scope);
    if (!existing) {
      throw AppError.notFound('Graduate not found');
    }

    if (existing.status === GRADUATE_STATUS.ACTIVE) {
      throw AppError.badRequest('Graduate is already active');
    }

    const unarchived = await this.graduatesRepository.unarchive(graduateId, scope);
    if (!unarchived) {
      throw AppError.notFound('Graduate not found');
    }

    return {
      graduate: sanitizeGraduate(unarchived),
      previousStatus: existing.status,
      newStatus: GRADUATE_STATUS.ACTIVE,
    };
  }

  async deleteGraduate(graduateId, user) {
    if (!mongoose.isValidObjectId(graduateId)) {
      throw AppError.badRequest('Invalid graduate ID');
    }

    const scope = this._resolveScope(user);

    const existing = await this.graduatesRepository.findById(graduateId, scope);
    if (!existing) {
      throw AppError.notFound('Graduate not found');
    }

    const removed = await this.graduatesRepository.remove(graduateId, scope);

    return {
      deleted: !!removed,
      graduateId,
      fullName: existing.fullName,
      matricNumber: existing.matricNumber,
    };
  }
}
