import mongoose from 'mongoose';
import {
  VerificationRecord,
  VERIFICATION_STATUS,
  VERIFICATION_METHOD,
} from '../../models/verification-record.model.js';
import { Certificate, CERTIFICATE_STATUS } from '../../models/certificate.model.js';
import { Graduate, GRADUATE_STATUS } from '../../models/graduate.model.js';
import { Institution, INSTITUTION_STATUS } from '../../models/institution.model.js';
import { USER_ROLES } from '../../models/user.model.js';
import { AppError } from '../../shared/errors/app-error.js';

export class VerificationsRepository {
  _resolveScope(user) {
    if (!user) return { institutionId: null, isSuperAdmin: false, userId: null };
    const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN;
    const institutionId = isSuperAdmin
      ? null
      : (user.institution?._id ?? user.institution)?.toString() ?? null;
    return { isSuperAdmin, institutionId, userId: user._id };
  }

  _applyScope(query, scope) {
    if (!scope.isSuperAdmin && scope.institutionId) {
      query.where({ institution: scope.institutionId });
    }
    return query;
  }

  async list(filters = {}, scope = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      method,
      search,
      certificateId,
      institutionId,
      graduateId,
      from,
      to,
      minConfidence,
      maxConfidence,
    } = filters;

    const query = VerificationRecord.find();
    this._applyScope(query, scope);

    if (institutionId && scope.isSuperAdmin) query.where({ institution: institutionId });
    if (certificateId) query.where({ certificate: certificateId });
    if (graduateId) query.where({ graduate: graduateId });
    if (status) query.where({ status });
    if (method) query.where({ method });
    if (minConfidence !== undefined && minConfidence !== null) {
      query.where({ confidenceScore: { $gte: Number(minConfidence) } });
    }
    if (maxConfidence !== undefined && maxConfidence !== null) {
      query.where({ confidenceScore: { $lte: Number(maxConfidence) } });
    }
    if (from || to) {
      const createdAtFilter = {};
      if (from) createdAtFilter.$gte = new Date(from);
      if (to) createdAtFilter.$lte = new Date(to);
      query.where({ createdAt: createdAtFilter });
    }
    if (search) {
      const r = new RegExp(search, 'i');
      query.where({
        $or: [{ verificationReference: r }],
      });
    }

    const [items, total] = await Promise.all([
      query.clone()
        .populate('certificate', 'certificateNumber status type awardTitle verificationReference')
        .populate('graduate', 'firstName lastName middleName matricNumber')
        .populate('institution', 'name type status')
        .populate('verifier', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      query.clone().countDocuments(),
    ]);

    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async findById(verificationId, scope = {}) {
    if (!mongoose.isValidObjectId(verificationId)) return null;
    const query = VerificationRecord.findById(verificationId)
      .populate('certificate', 'certificateNumber status type awardTitle verificationReference documentUrl')
      .populate('graduate', 'firstName lastName middleName matricNumber email programme graduationYear')
      .populate('institution', 'name type status logoUrl verificationPrefix country city website publicContactEmail')
      .populate('verifier', 'firstName lastName email role');
    this._applyScope(query, scope);
    return query.exec();
  }

  async findByVerificationReference(ref) {
    return VerificationRecord.findOne({ verificationReference: ref })
      .populate('certificate', 'certificateNumber status type awardTitle verificationReference')
      .populate('graduate', 'firstName lastName middleName matricNumber')
      .populate('institution', 'name type status logoUrl')
      .populate('verifier', 'firstName lastName email')
      .exec();
  }

  async findByCertificateRef(reference) {
    const cert = await Certificate.findOne({ verificationReference: reference.toUpperCase() }).exec();
    if (!cert) return { certificate: null, verifications: [] };
    const recent = await VerificationRecord.find({ certificate: cert._id })
      .populate('verifier', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
    return { certificate: cert, verifications: recent };
  }

  async create(payload) {
    const record = new VerificationRecord(payload);
    if (!record.verificationReference) {
      record.verificationReference = record.generateVerificationReference();
    }
    await record.save();
    await record.populate([
      { path: 'certificate', select: 'certificateNumber status type awardTitle' },
      { path: 'graduate', select: 'firstName lastName middleName matricNumber' },
      { path: 'institution', select: 'name type status' },
    ]);
    return record;
  }

  async update(verificationId, payload, scope = {}) {
    const filter = { _id: verificationId };
    if (!scope.isSuperAdmin && scope.institutionId) filter.institution = scope.institutionId;
    return VerificationRecord.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    })
      .populate('certificate', 'certificateNumber status type awardTitle')
      .populate('graduate', 'firstName lastName middleName matricNumber')
      .exec();
  }

  async markCompleted(verificationId, resultData) {
    return VerificationRecord.findByIdAndUpdate(
      verificationId,
      {
        ...resultData,
        completedAt: new Date(),
      },
      { new: true, runValidators: true },
    )
      .populate('certificate', 'certificateNumber status type awardTitle verificationReference')
      .populate('graduate', 'firstName lastName middleName matricNumber email')
      .populate('institution', 'name type status logoUrl')
      .exec();
  }

  async findByCertificateNumber(certificateNumber, institutionHint = null) {
    const certFilter = { certificateNumber: new RegExp(`^${certificateNumber}$`, 'i') };
    if (institutionHint) certFilter.institution = institutionHint;
    const certificates = await Certificate.find(certFilter)
      .populate('graduate')
      .populate('institution')
      .exec();
    return certificates;
  }

  async findCandidateCertificates({ certificateNumber, surname, matricNumber, institutionId, awardTitle, programme }) {
    const matchAny = [];
    if (certificateNumber) matchAny.push({ certificateNumber: new RegExp(certificateNumber, 'i') });
    if (surname) {
      const grads = await Graduate.find({ lastName: new RegExp(`^${surname}$`, 'i') }).limit(50).exec();
      const gradIds = grads.map((g) => g._id);
      if (gradIds.length) matchAny.push({ graduate: { $in: gradIds } });
    }
    if (matricNumber) {
      const grads = await Graduate.find({ matricNumber: new RegExp(matricNumber, 'i') }).limit(20).exec();
      const gradIds = grads.map((g) => g._id);
      if (gradIds.length) matchAny.push({ graduate: { $in: gradIds } });
    }

    let certFilter = {};
    if (matchAny.length === 1) certFilter = matchAny[0];
    else if (matchAny.length > 1) certFilter = { $or: matchAny };
    if (institutionId) certFilter.institution = institutionId;

    let certs = await Certificate.find(certFilter)
      .populate('graduate')
      .populate('institution')
      .limit(20)
      .exec();

    if (certs.length === 0 && certificateNumber) {
      certs = await Certificate.find({
        certificateNumber: new RegExp(certificateNumber.replace(/[\-\s]/g, ''), 'i'),
      })
        .populate('graduate')
        .populate('institution')
        .limit(20)
        .exec();
    }

    return certs;
  }

  async listForCertificate(certificateId, scope = {}, filters = {}) {
    const { page = 1, limit = 20 } = filters;
    const query = VerificationRecord.find({ certificate: certificateId });
    this._applyScope(query, scope);
    const [items, total] = await Promise.all([
      query.clone()
        .populate('verifier', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      query.clone().countDocuments(),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async listForGraduate(graduateId, scope = {}, filters = {}) {
    const { page = 1, limit = 20 } = filters;
    const query = VerificationRecord.find({ graduate: graduateId });
    this._applyScope(query, scope);
    const [items, total] = await Promise.all([
      query.clone()
        .populate('certificate', 'certificateNumber type awardTitle status')
        .populate('verifier', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      query.clone().countDocuments(),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async countInLastNMinutes(nMinutes, scope = {}) {
    const filter = {
      createdAt: { $gte: new Date(Date.now() - nMinutes * 60 * 1000) },
    };
    if (!scope.isSuperAdmin && scope.institutionId) filter.institution = scope.institutionId;
    return VerificationRecord.countDocuments(filter);
  }
}
