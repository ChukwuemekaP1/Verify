import mongoose from 'mongoose';
import { AuditLog } from '../../models/audit-log.model.js';
import { USER_ROLES } from '../../models/user.model.js';
import { AppError } from '../../shared/errors/app-error.js';

export class AuditLogsRepository {
  _resolveScope(user) {
    if (!user) return { institutionId: null, isSuperAdmin: false };
    if (user.role === USER_ROLES.SUPER_ADMIN) return { institutionId: null, isSuperAdmin: true };
    const institutionId = user.institution?._id ?? user.institution;
    return { institutionId: institutionId?.toString() ?? null, isSuperAdmin: false };
  }

  _applyScope(query, scope) {
    if (!scope.isSuperAdmin && scope.institutionId) {
      query.where({ institution: scope.institutionId });
    }
    return query;
  }

  async list(filters = {}, user) {
    const scope = this._resolveScope(user);
    if (!scope.isSuperAdmin && !scope.institutionId) {
      return { items: [], page: filters.page || 1, limit: filters.limit || 20, total: 0, pageCount: 0 };
    }

    const {
      page = 1,
      limit = 50,
      action,
      entityType,
      entityId,
      actor,
      severity,
      success,
      from,
      to,
      search,
    } = filters;

    const query = AuditLog.find();
    this._applyScope(query, scope);

    if (action) query.where({ action });
    if (entityType) query.where({ entityType });
    if (entityId && mongoose.isValidObjectId(entityId)) query.where({ entityId });
    if (actor && mongoose.isValidObjectId(actor)) query.where({ actor });
    if (severity) query.where({ severity });
    if (success !== undefined && success !== null) query.where({ success: success === 'true' || success === true });
    if (from || to) {
      const createdAtFilter = {};
      if (from) createdAtFilter.$gte = new Date(from);
      if (to) createdAtFilter.$lte = new Date(to);
      query.where({ createdAt: createdAtFilter });
    }
    if (search) {
      const r = new RegExp(search, 'i');
      query.where({
        $or: [
          { entityLabel: r },
          { actorLabel: r },
          { errorMessage: r },
        ],
      });
    }

    const [items, total] = await Promise.all([
      query.clone()
        .populate('actor', 'firstName lastName email role')
        .populate('institution', 'name type status')
        .sort({ createdAt: -1 })
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

  async findById(auditLogId, user) {
    if (!mongoose.isValidObjectId(auditLogId)) {
      throw AppError.badRequest('Invalid audit log ID');
    }
    const scope = this._resolveScope(user);
    if (!scope.isSuperAdmin && !scope.institutionId) return null;
    const query = AuditLog.findById(auditLogId)
      .populate('actor', 'firstName lastName email role')
      .populate('institution', 'name type status');
    this._applyScope(query, scope);
    return query.exec();
  }

  async findForEntity(entityType, entityId, filters = {}, user) {
    const scope = this._resolveScope(user);
    if (!scope.isSuperAdmin && !scope.institutionId) {
      return { items: [], page: filters.page || 1, limit: filters.limit || 20, total: 0, pageCount: 0 };
    }
    const { page = 1, limit = 50, action, severity } = filters;
    const query = AuditLog.find({ entityType, entityId });
    this._applyScope(query, scope);
    if (action) query.where({ action });
    if (severity) query.where({ severity });
    const [items, total] = await Promise.all([
      query.clone()
        .populate('actor', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      query.clone().countDocuments(),
    ]);
    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async stats(user) {
    const scope = this._resolveScope(user);
    if (!scope.isSuperAdmin && !scope.institutionId) {
      return { total: 0, byAction: {}, bySeverity: {}, byEntity: {}, successRate: 0, last7Days: [] };
    }
    const base = {};
    if (!scope.isSuperAdmin && scope.institutionId) base.institution = scope.institutionId;

    const [total, byActionRaw, bySeverityRaw, byEntityRaw, successCount, last7DaysRaw] = await Promise.all([
      AuditLog.countDocuments(base),
      AuditLog.aggregate([
        { $match: base },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: base },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: base },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
      ]),
      AuditLog.countDocuments({ ...base, success: true }),
      AuditLog.aggregate([
        {
          $match: {
            ...base,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            errors: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const byAction = {};
    for (const r of byActionRaw) byAction[r._id] = r.count;
    const bySeverity = {};
    for (const r of bySeverityRaw) bySeverity[r._id] = r.count;
    const byEntity = {};
    for (const r of byEntityRaw) byEntity[r._id] = r.count;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

    return {
      total,
      byAction,
      bySeverity,
      byEntity,
      successRate,
      last7Days: last7DaysRaw.map((r) => ({ date: r._id, count: r.count, errors: r.errors })),
    };
  }

  async exports(user, filters = {}) {
    const scope = this._resolveScope(user);
    if (!scope.isSuperAdmin && !scope.institutionId) return [];
    const query = AuditLog.find();
    this._applyScope(query, scope);
    if (filters.from) query.where({ createdAt: { $gte: new Date(filters.from) } });
    if (filters.to) query.where({ createdAt: { $lte: new Date(filters.to) } });
    return query
      .populate('actor', 'firstName lastName email role')
      .populate('institution', 'name')
      .sort({ createdAt: -1 })
      .limit(10000)
      .exec();
  }
}
