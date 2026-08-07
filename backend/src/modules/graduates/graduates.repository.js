import mongoose from 'mongoose';

import { Graduate, GRADUATE_STATUS } from '../../models/graduate.model.js';

export class GraduatesRepository {
  _applyInstitutionScope(query, institutionId) {
    if (institutionId) {
      query.where({ institution: institutionId });
    }
    return query;
  }

  async list(filters = {}, scope = {}) {
    const { page = 1, limit = 20, search, programme, level, graduationYear, status, matricNumber, classification } =
      filters;
    const { institutionId } = scope;

    const query = Graduate.find();

    this._applyInstitutionScope(query, institutionId);

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.where({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { middleName: searchRegex },
          { matricNumber: searchRegex },
          { email: searchRegex },
          { programme: searchRegex },
          { classification: searchRegex },
        ],
      });
    }

    if (programme) {
      query.where({ programme: new RegExp(programme, 'i') });
    }

    if (level) {
      query.where({ level });
    }

    if (graduationYear) {
      query.where({ graduationYear });
    }

    if (status) {
      query.where({ status });
    }

    if (matricNumber) {
      query.where({ matricNumber: new RegExp(matricNumber, 'i') });
    }

    if (classification) {
      query.where({ classification: new RegExp(classification, 'i') });
    }

    const [items, total] = await Promise.all([
      query
        .clone()
        .populate('institution', 'name type status')
        .populate('certificateCount')
        .sort({ lastName: 1, firstName: 1 })
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

  async findById(graduateId, scope = {}) {
    const { institutionId } = scope;
    const query = Graduate.findById(graduateId)
      .populate('institution', 'name type status')
      .populate('certificateCount');
    this._applyInstitutionScope(query, institutionId);
    return query.exec();
  }

  async findByMatricNumber(institutionId, matricNumber) {
    return Graduate.findOne({
      institution: institutionId,
      matricNumber,
    })
      .populate('institution', 'name type status')
      .exec();
  }

  async create(payload) {
    const graduate = new Graduate(payload);
    await graduate.save();
    return graduate
      .populate('institution', 'name type status')
      .populate('certificateCount');
  }

  async update(graduateId, payload, scope = {}) {
    const { institutionId } = scope;
    const filter = { _id: graduateId };
    if (institutionId) {
      filter.institution = institutionId;
    }
    return Graduate.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    })
      .populate('institution', 'name type status')
      .populate('certificateCount')
      .exec();
  }

  async updateStatus(graduateId, status, scope = {}) {
    const { institutionId } = scope;
    const filter = { _id: graduateId };
    if (institutionId) {
      filter.institution = institutionId;
    }
    return Graduate.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true },
    )
      .populate('institution', 'name type status')
      .populate('certificateCount')
      .exec();
  }

  async archive(graduateId, scope = {}) {
    return this.updateStatus(graduateId, GRADUATE_STATUS.ARCHIVED, scope);
  }

  async unarchive(graduateId, scope = {}) {
    return this.updateStatus(graduateId, GRADUATE_STATUS.ACTIVE, scope);
  }

  async remove(graduateId, scope = {}) {
    const { institutionId } = scope;
    const filter = { _id: graduateId };
    if (institutionId) {
      filter.institution = institutionId;
    }
    return Graduate.findOneAndDelete(filter).exec();
  }

  async countByInstitution(institutionId, criteria = {}) {
    return Graduate.countDocuments({ institution: institutionId, ...criteria }).exec();
  }

  async existsByMatricNumber(institutionId, matricNumber, excludeGraduateId = null) {
    const filter = {
      institution: institutionId,
      matricNumber,
    };
    if (excludeGraduateId) {
      filter._id = { $ne: excludeGraduateId };
    }
    return Graduate.exists(filter).exec();
  }

  async listDistinctGraduationYears(institutionId = null) {
    const filter = {};
    if (institutionId) {
      filter.institution = institutionId;
    }
    const years = await Graduate.find(filter)
      .distinct('graduationYear')
      .exec();
    return years.filter(Boolean).sort().reverse();
  }

  async listDistinctProgrammes(institutionId = null) {
    const filter = {};
    if (institutionId) {
      filter.institution = institutionId;
    }
    const programmes = await Graduate.find(filter)
      .distinct('programme')
      .exec();
    return programmes.filter(Boolean).sort();
  }
}
