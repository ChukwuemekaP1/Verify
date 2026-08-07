import mongoose from 'mongoose';

import { AppError } from '../../shared/errors/app-error.js';
import { INSTITUTION_STATUS } from '../../models/institution.model.js';

function sanitizeInstitution(institution) {
  if (!institution) return null;
  const obj = typeof institution.toObject === 'function' ? institution.toObject() : { ...institution };
  delete obj.__v;
  return obj;
}

function sanitizeUser(user) {
  if (!user) return null;
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  return obj;
}

export class InstitutionsService {
  constructor({ institutionsRepository }) {
    this.institutionsRepository = institutionsRepository;
  }

  async listInstitutions(filters) {
    const result = await this.institutionsRepository.list(filters);
    return {
      ...result,
      items: result.items.map(sanitizeInstitution),
    };
  }

  async getInstitution(institutionId) {
    if (!mongoose.isValidObjectId(institutionId)) {
      throw AppError.badRequest('Invalid institution ID');
    }

    const institution = await this.institutionsRepository.findById(institutionId);
    if (!institution) {
      throw AppError.notFound('Institution not found');
    }

    const [admin, adminCount] = await Promise.all([
      this.institutionsRepository.findAdminByInstitution(institutionId),
      this.institutionsRepository.countAdminsByInstitution(institutionId),
    ]);

    return {
      institution: sanitizeInstitution(institution),
      admin: admin ? sanitizeUser(admin) : null,
      adminCount,
    };
  }

  async createInstitution(payload) {
    const {
      adminEmail,
      adminFirstName,
      adminLastName,
      adminPassword,
      ...institutionPayload
    } = payload;

    if (institutionPayload.verificationPrefix) {
      const existingByPrefix = await this.institutionsRepository.findByVerificationPrefix(
        institutionPayload.verificationPrefix,
      );
      if (existingByPrefix) {
        throw AppError.badRequest('Verification prefix is already in use');
      }
    }

    if (institutionPayload.accreditationRef) {
      const existingByAccreditation = await this.institutionsRepository.findByAccreditationRef(
        institutionPayload.accreditationRef,
      );
      if (existingByAccreditation) {
        throw AppError.badRequest('Accreditation reference is already registered');
      }
    }

    const duplicate = await this.institutionsRepository.existsByNameAndCountry(
      institutionPayload.name,
      institutionPayload.country,
    );
    if (duplicate) {
      throw AppError.badRequest('An institution with this name and country already exists');
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const institution = await this.institutionsRepository.create(institutionPayload);

      let admin = null;
      if (adminEmail && adminFirstName && adminLastName) {
        admin = await this.institutionsRepository.createInstitutionAdmin({
          institutionId: institution._id,
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          password: adminPassword,
        });
      }

      await session.commitTransaction();

      return {
        institution: sanitizeInstitution(institution),
        admin: admin ? sanitizeUser(admin) : null,
      };
    } catch (error) {
      await session.abortTransaction();
      if (error?.code === 11000) {
        const keyPattern = error.keyPattern ?? {};
        if (keyPattern.verificationPrefix) {
          throw AppError.badRequest('Verification prefix is already in use');
        }
        if (keyPattern.email) {
          throw AppError.badRequest('Admin email is already registered');
        }
        throw AppError.badRequest('A unique constraint was violated');
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async updateInstitution(institutionId, payload) {
    if (!mongoose.isValidObjectId(institutionId)) {
      throw AppError.badRequest('Invalid institution ID');
    }

    const existing = await this.institutionsRepository.findById(institutionId);
    if (!existing) {
      throw AppError.notFound('Institution not found');
    }

    if (payload.verificationPrefix && payload.verificationPrefix !== existing.verificationPrefix) {
      const existingByPrefix = await this.institutionsRepository.findByVerificationPrefix(
        payload.verificationPrefix,
      );
      if (existingByPrefix) {
        throw AppError.badRequest('Verification prefix is already in use');
      }
    }

    if (payload.accreditationRef && payload.accreditationRef !== existing.accreditationRef) {
      const existingByAccreditation = await this.institutionsRepository.findByAccreditationRef(
        payload.accreditationRef,
      );
      if (existingByAccreditation) {
        throw AppError.badRequest('Accreditation reference is already registered');
      }
    }

    const updated = await this.institutionsRepository.update(institutionId, payload);
    if (!updated) {
      throw AppError.notFound('Institution not found');
    }

    return {
      institution: sanitizeInstitution(updated),
    };
  }

  async updateInstitutionStatus(institutionId, payload) {
    if (!mongoose.isValidObjectId(institutionId)) {
      throw AppError.badRequest('Invalid institution ID');
    }

    const existing = await this.institutionsRepository.findById(institutionId);
    if (!existing) {
      throw AppError.notFound('Institution not found');
    }

    const validTransitions = {
      [INSTITUTION_STATUS.PENDING]: [INSTITUTION_STATUS.ACTIVE, INSTITUTION_STATUS.SUSPENDED, INSTITUTION_STATUS.INACTIVE],
      [INSTITUTION_STATUS.ACTIVE]: [INSTITUTION_STATUS.SUSPENDED, INSTITUTION_STATUS.INACTIVE],
      [INSTITUTION_STATUS.SUSPENDED]: [INSTITUTION_STATUS.ACTIVE, INSTITUTION_STATUS.INACTIVE],
      [INSTITUTION_STATUS.INACTIVE]: [INSTITUTION_STATUS.ACTIVE],
    };

    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(payload.status)) {
      throw new AppError({
        message: `Cannot transition from ${existing.status} to ${payload.status}`,
        statusCode: 400,
        code: 'INVALID_STATUS_TRANSITION',
        details: { current: existing.status, requested: payload.status, allowed },
      });
    }

    const updated = await this.institutionsRepository.updateStatus(institutionId, payload.status);

    return {
      institution: sanitizeInstitution(updated),
      previousStatus: existing.status,
      newStatus: payload.status,
    };
  }

  async deleteInstitution(institutionId) {
    if (!mongoose.isValidObjectId(institutionId)) {
      throw AppError.badRequest('Invalid institution ID');
    }

    const existing = await this.institutionsRepository.findById(institutionId);
    if (!existing) {
      throw AppError.notFound('Institution not found');
    }

    const removed = await this.institutionsRepository.remove(institutionId);

    return {
      deleted: !!removed,
      institutionId,
      name: existing.name,
    };
  }
}
