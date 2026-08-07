import mongoose from 'mongoose';
import crypto from 'crypto';

import { Certificate, CERTIFICATE_STATUS, VERIFICATION_METHOD } from '../../models/certificate.model.js';

export class CertificatesRepository {
  _applyInstitutionScope(query, institutionId) {
    if (institutionId) {
      query.where({ institution: institutionId });
    }
    return query;
  }

  async list(filters = {}, scope = {}) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      graduateId,
      certificateNumber,
      verificationReference,
      issueDateFrom,
      issueDateTo,
      classification,
    } = filters;
    const { institutionId } = scope;

    const query = Certificate.find();

    this._applyInstitutionScope(query, institutionId);

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.where({
        $or: [
          { certificateNumber: searchRegex },
          { awardTitle: searchRegex },
          { programme: searchRegex },
          { classification: searchRegex },
          { verificationReference: searchRegex },
        ],
      });
    }

    if (status) {
      query.where({ status });
    }

    if (type) {
      query.where({ type });
    }

    if (graduateId) {
      query.where({ graduate: graduateId });
    }

    if (certificateNumber) {
      query.where({ certificateNumber: new RegExp(certificateNumber, 'i') });
    }

    if (verificationReference) {
      query.where({ verificationReference: new RegExp(verificationReference, 'i') });
    }

    if (classification) {
      query.where({ classification: new RegExp(classification, 'i') });
    }

    if (issueDateFrom || issueDateTo) {
      const dateFilter = {};
      if (issueDateFrom) {
        dateFilter.$gte = new Date(issueDateFrom);
      }
      if (issueDateTo) {
        dateFilter.$lte = new Date(issueDateTo);
      }
      query.where({ issueDate: dateFilter });
    }

    const [items, total] = await Promise.all([
      query
        .clone()
        .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear')
        .populate('institution', 'name type status verificationPrefix')
        .sort({ issueDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      query.clone().countDocuments(),
    ]);

    const pageCount = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      pageCount,
    };
  }

  async findById(certificateId, scope = {}) {
    const { institutionId } = scope;
    const query = Certificate.findById(certificateId)
      .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear dateOfBirth nationalId')
      .populate('institution', 'name type status verificationPrefix logoUrl country city website publicContactEmail')
      .populate('ocrReviewedBy', 'firstName lastName email')
      .populate('publishedBy', 'firstName lastName email')
      .populate('revokedBy', 'firstName lastName email');
    this._applyInstitutionScope(query, institutionId);
    return query.exec();
  }

  async findByCertificateNumber(institutionId, certificateNumber) {
    return Certificate.findOne({
      institution: institutionId,
      certificateNumber,
    })
      .populate('graduate', 'firstName lastName middleName matricNumber email programme')
      .populate('institution', 'name type status')
      .exec();
  }

  async findByVerificationReference(verificationReference) {
    return Certificate.findOne({
      verificationReference: verificationReference.toUpperCase(),
    })
      .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear')
      .populate('institution', 'name type status verificationPrefix logoUrl country city')
      .exec();
  }

  async existsByCertificateNumber(institutionId, certificateNumber, excludeCertificateId = null) {
    const filter = {
      institution: institutionId,
      certificateNumber,
    };
    if (excludeCertificateId) {
      filter._id = { $ne: excludeCertificateId };
    }
    return Certificate.exists(filter).exec();
  }

  async existsByVerificationReference(verificationReference, excludeCertificateId = null) {
    const filter = {
      verificationReference: verificationReference.toUpperCase(),
    };
    if (excludeCertificateId) {
      filter._id = { $ne: excludeCertificateId };
    }
    return Certificate.exists(filter).exec();
  }

  async create(payload) {
    const cert = new Certificate(payload);
    if (!cert.verificationReference && payload.institution) {
      const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
      const timestampPart = Date.now().toString(36).toUpperCase();
      cert.verificationReference = `${timestampPart}${randomPart}`;
    }
    await cert.save();
    return cert
      .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear')
      .populate('institution', 'name type status verificationPrefix');
  }

  async update(certificateId, payload, scope = {}) {
    const { institutionId } = scope;
    const filter = { _id: certificateId };
    if (institutionId) {
      filter.institution = institutionId;
    }
    return Certificate.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    })
      .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear')
      .populate('institution', 'name type status verificationPrefix')
      .exec();
  }

  async updateStatus(certificateId, status, scope = {}, extraFields = {}) {
    const { institutionId } = scope;
    const filter = { _id: certificateId };
    if (institutionId) {
      filter.institution = institutionId;
    }
    const updateData = { status, ...extraFields };
    return Certificate.findOneAndUpdate(filter, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('graduate', 'firstName lastName middleName matricNumber email programme level graduationYear')
      .populate('institution', 'name type status verificationPrefix')
      .exec();
  }

  async publish(certificateId, userId, scope = {}) {
    return this.updateStatus(certificateId, CERTIFICATE_STATUS.PUBLISHED, scope, {
      publishedAt: new Date(),
      publishedBy: userId,
    });
  }

  async revoke(certificateId, userId, reason, scope = {}) {
    return this.updateStatus(certificateId, CERTIFICATE_STATUS.REVOKED, scope, {
      revokedAt: new Date(),
      revokedBy: userId,
      revocationReason: reason,
    });
  }

  async remove(certificateId, scope = {}) {
    const { institutionId } = scope;
    const filter = { _id: certificateId };
    if (institutionId) {
      filter.institution = institutionId;
    }
    return Certificate.findOneAndDelete(filter).exec();
  }

  async countByInstitution(institutionId, criteria = {}) {
    return Certificate.countDocuments({ institution: institutionId, ...criteria }).exec();
  }

  async countByGraduate(graduateId, criteria = {}) {
    return Certificate.countDocuments({ graduate: graduateId, ...criteria }).exec();
  }

  async listByGraduate(graduateId, scope = {}, filters = {}) {
    const { page = 1, limit = 50, status, type } = filters;
    const { institutionId } = scope;

    const query = Certificate.find({ graduate: graduateId });
    this._applyInstitutionScope(query, institutionId);

    if (status) {
      query.where({ status });
    }
    if (type) {
      query.where({ type });
    }

    const [items, total] = await Promise.all([
      query
        .clone()
        .populate('institution', 'name type status')
        .sort({ issueDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      query.clone().countDocuments(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit),
    };
  }

  async listDistinctCertificateTypes(institutionId = null) {
    const filter = {};
    if (institutionId) {
      filter.institution = institutionId;
    }
    const types = await Certificate.find(filter)
      .distinct('type')
      .exec();
    return types.filter(Boolean);
  }

  async listDistinctStatuses(institutionId = null) {
    const filter = {};
    if (institutionId) {
      filter.institution = institutionId;
    }
    const statuses = await Certificate.find(filter)
      .distinct('status')
      .exec();
    return statuses.filter(Boolean);
  }

  async incrementVerificationCount(certificateId) {
    return Certificate.findByIdAndUpdate(
      certificateId,
      {
        $inc: { verificationCount: 1 },
        lastVerifiedAt: new Date(),
      },
      { new: true, runValidators: true },
    ).exec();
  }
}
