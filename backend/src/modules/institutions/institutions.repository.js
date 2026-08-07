import mongoose from 'mongoose';

import { Institution } from '../../models/institution.model.js';
import { User, USER_ROLES, USER_STATUS } from '../../models/user.model.js';
import { env } from '../../config/env.js';

export class InstitutionsRepository {
  async list(filters = {}) {
    const { page = 1, limit = 20, search, type, status, country } = filters;

    const query = Institution.find();

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.where({
        $or: [
          { name: searchRegex },
          { accreditationRef: searchRegex },
          { verificationPrefix: searchRegex },
        ],
      });
    }

    if (type) {
      query.where({ type });
    }

    if (status) {
      query.where({ status });
    }

    if (country) {
      query.where({ country: new RegExp(`^${country}$`, 'i') });
    }

    const [items, total] = await Promise.all([
      query
        .clone()
        .sort({ createdAt: -1 })
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

  async findById(institutionId) {
    return Institution.findById(institutionId).exec();
  }

  async findByAccreditationRef(accreditationRef) {
    return Institution.findOne({ accreditationRef }).exec();
  }

  async findByVerificationPrefix(verificationPrefix) {
    return Institution.findOne({ verificationPrefix }).exec();
  }

  async existsByNameAndCountry(name, country) {
    return Institution.exists({
      name: new RegExp(`^${name}$`, 'i'),
      country: country ? new RegExp(`^${country}$`, 'i') : { $exists: true },
    }).exec();
  }

  async create(payload) {
    const institution = new Institution(payload);
    await institution.save();
    return institution;
  }

  async update(institutionId, payload) {
    return Institution.findByIdAndUpdate(institutionId, payload, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async updateStatus(institutionId, status) {
    return Institution.findByIdAndUpdate(
      institutionId,
      { status },
      { new: true, runValidators: true },
    ).exec();
  }

  async remove(institutionId) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const institution = await Institution.findByIdAndDelete(institutionId)
        .session(session)
        .exec();

      if (institution) {
        await User.updateMany(
          { institution: institutionId },
          { $set: { institution: null, status: USER_STATUS.INACTIVE } },
          { session },
        ).exec();
      }

      await session.commitTransaction();
      return institution;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createInstitutionAdmin({ institutionId, email, firstName, lastName, password }) {
    const user = new User({
      email,
      firstName,
      lastName,
      password: password ?? env.SUPER_ADMIN_PASSWORD,
      role: USER_ROLES.INSTITUTION_ADMIN,
      status: USER_STATUS.ACTIVE,
      institution: institutionId,
    });
    await user.save();
    return user;
  }

  async findAdminByInstitution(institutionId) {
    return User.findOne({
      institution: institutionId,
      role: USER_ROLES.INSTITUTION_ADMIN,
    })
      .sort({ createdAt: 1 })
      .exec();
  }

  async countAdminsByInstitution(institutionId) {
    return User.countDocuments({
      institution: institutionId,
      role: USER_ROLES.INSTITUTION_ADMIN,
    }).exec();
  }
}
