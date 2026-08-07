import mongoose from 'mongoose';
import { Certificate, CERTIFICATE_STATUS } from '../../models/certificate.model.js';
import { Graduate, GRADUATE_STATUS } from '../../models/graduate.model.js';
import { Institution, INSTITUTION_STATUS } from '../../models/institution.model.js';
import { VerificationRecord, VERIFICATION_STATUS, VERIFICATION_METHOD } from '../../models/verification-record.model.js';
import { AuditLog } from '../../models/audit-log.model.js';
import { USER_ROLES } from '../../models/user.model.js';

export class AnalyticsRepository {
  _resolveScope(user) {
    if (!user) return { institutionId: null, isSuperAdmin: false };
    if (user.role === USER_ROLES.SUPER_ADMIN) return { institutionId: null, isSuperAdmin: true };
    const institutionId = user.institution?._id ?? user.institution;
    return { institutionId: institutionId?.toString() ?? null, isSuperAdmin: false };
  }

  async dashboard(user) {
    const scope = this._resolveScope(user);
    const instFilter = scope.isSuperAdmin ? {} : { institution: scope.institutionId };

    const [
      graduateCounts,
      certificateCounts,
      verificationCounts,
      institutionCount,
      recentVerifications,
      verificationStatusBreakdown,
      verificationMethodBreakdown,
      certificatesLast12Months,
      verificationsLast12Months,
      graduatesLast12Months,
      topProgrammes,
      topInstitutions,
    ] = await Promise.all([
      this._graduateCounts(instFilter),
      this._certificateCounts(instFilter),
      this._verificationCounts(instFilter),
      scope.isSuperAdmin ? Institution.countDocuments() : 0,
      VerificationRecord.find(instFilter)
        .populate('certificate', 'certificateNumber status type awardTitle')
        .populate('graduate', 'firstName lastName matricNumber')
        .populate('institution', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec(),
      this._verificationStatusBreakdown(instFilter),
      this._verificationMethodBreakdown(instFilter),
      this._countByMonth(Certificate, instFilter, 12),
      this._countByMonth(VerificationRecord, instFilter, 12),
      this._countByMonth(Graduate, instFilter, 12),
      this._topProgrammes(instFilter, 8),
      scope.isSuperAdmin ? this._topInstitutions(8) : null,
    ]);

    return {
      scope: { isSuperAdmin: scope.isSuperAdmin, institutionId: scope.institutionId },
      graduates: graduateCounts,
      certificates: certificateCounts,
      verifications: verificationCounts,
      institutionCount,
      recentVerifications,
      verificationStatusBreakdown,
      verificationMethodBreakdown,
      trend: {
        certificates: certificatesLast12Months,
        verifications: verificationsLast12Months,
        graduates: graduatesLast12Months,
      },
      topProgrammes,
      topInstitutions,
      generatedAt: new Date(),
    };
  }

  async _graduateCounts(filter = {}) {
    const total = await Graduate.countDocuments({ ...filter, status: { $ne: 'DELETED' } });
    const active = await Graduate.countDocuments({ ...filter, status: GRADUATE_STATUS.ACTIVE });
    const archived = await Graduate.countDocuments({ ...filter, status: GRADUATE_STATUS.ARCHIVED });
    return { total, active, archived };
  }

  async _certificateCounts(filter = {}) {
    const statuses = Object.values(CERTIFICATE_STATUS);
    const baseCert = { ...filter };
    const total = await Certificate.countDocuments(baseCert);
    const perStatus = {};
    for (const s of statuses) {
      perStatus[s] = await Certificate.countDocuments({ ...baseCert, status: s });
    }
    const published = perStatus.PUBLISHED || 0;
    const verified = perStatus.VERIFIED || 0;
    const pendingReview = perStatus.PENDING_REVIEW || 0;
    const processing = perStatus.PROCESSING || 0;
    const revoked = perStatus.REVOKED || 0;

    const totalVerifications = await Certificate.aggregate([
      { $match: baseCert },
      { $group: { _id: null, sum: { $sum: '$verificationCount' } } },
    ]);
    const verificationsIssued = totalVerifications[0]?.sum || 0;

    return {
      total,
      published,
      verified,
      pendingReview,
      processing,
      revoked,
      perStatus,
      verificationsIssued,
    };
  }

  async _verificationCounts(filter = {}) {
    const base = { ...filter };
    const total = await VerificationRecord.countDocuments(base);
    const authentic = await VerificationRecord.countDocuments({ ...base, status: VERIFICATION_STATUS.AUTHENTIC });
    const suspicious = await VerificationRecord.countDocuments({ ...base, status: VERIFICATION_STATUS.SUSPICIOUS });
    const invalid = await VerificationRecord.countDocuments({ ...base, status: VERIFICATION_STATUS.INVALID });
    const notFound = await VerificationRecord.countDocuments({ ...base, status: VERIFICATION_STATUS.NOT_FOUND });
    const pending = await VerificationRecord.countDocuments({ ...base, status: VERIFICATION_STATUS.PENDING });
    const error = await VerificationRecord.countDocuments({ ...base, status: VERIFICATION_STATUS.ERROR });
    const last7Days = await VerificationRecord.countDocuments({
      ...base,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const avgConfidence = await VerificationRecord.aggregate([
      { $match: { ...base, confidenceScore: { $exists: true, $gte: 0 } } },
      { $group: { _id: null, avg: { $avg: '$confidenceScore' } } },
    ]);
    const successRate = total > 0 ? Math.round(((authentic + suspicious) / total) * 100) : 0;

    return {
      total,
      authentic,
      suspicious,
      invalid,
      notFound,
      pending,
      error,
      last7Days,
      successRate,
      averageConfidence: avgConfidence[0]?.avg ? Math.round(avgConfidence[0].avg) : 0,
    };
  }

  async _verificationStatusBreakdown(filter = {}) {
    return VerificationRecord.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).then((rows) => {
      const out = {};
      for (const r of rows) out[r._id] = r.count;
      return out;
    });
  }

  async _verificationMethodBreakdown(filter = {}) {
    return VerificationRecord.aggregate([
      { $match: filter },
      { $group: { _id: '$method', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).then((rows) => {
      const out = {};
      for (const r of rows) out[r._id] = r.count;
      return out;
    });
  }

  async _countByMonth(Model, filter = {}, months = 12) {
    const now = new Date();
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await Model.countDocuments({
        ...filter,
        createdAt: { $gte: start, $lt: end },
      });
      results.push({
        month: start.toISOString().slice(0, 7),
        label: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count,
      });
    }
    return results;
  }

  async _topProgrammes(filter = {}, limit = 10) {
    return Graduate.aggregate([
      { $match: { ...filter, programme: { $exists: true, $ne: '' } } },
      { $group: { _id: '$programme', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]).then((rows) => rows.map((r) => ({ programme: r._id, count: r.count })));
  }

  async _topInstitutions(limit = 10) {
    const rows = await Certificate.aggregate([
      { $group: { _id: '$institution', certCount: { $sum: 1 }, verifCount: { $sum: '$verificationCount' } } },
      { $sort: { certCount: -1 } },
      { $limit: limit },
    ]);
    const ids = rows.map((r) => r._id).filter((x) => x);
    const insts = await Institution.find({ _id: { $in: ids } }, 'name type status verificationPrefix');
    const byId = Object.fromEntries(insts.map((i) => [i._id.toString(), i]));
    return rows.map((r) => ({
      institution: byId[r._id?.toString()] || null,
      certificateCount: r.certCount,
      verificationCount: r.verifCount || 0,
    }));
  }

  async systemStatistics(user) {
    const scope = this._resolveScope(user);
    if (!scope.isSuperAdmin) return null;

    const [
      institutions,
      users,
      auditLogs,
      databaseStats,
      storageEstimate,
    ] = await Promise.all([
      this._institutionStats(),
      this._userStats(),
      AuditLog.countDocuments(),
      this._databaseStats(),
      this._storageEstimate(),
    ]);

    return {
      institutions,
      users,
      auditLogs,
      database: databaseStats,
      storage: storageEstimate,
      generatedAt: new Date(),
    };
  }

  async _institutionStats() {
    const total = await Institution.countDocuments();
    const active = await Institution.countDocuments({ status: INSTITUTION_STATUS.ACTIVE });
    const pending = await Institution.countDocuments({ status: INSTITUTION_STATUS.PENDING });
    const inactive = await Institution.countDocuments({ status: INSTITUTION_STATUS.INACTIVE });
    const suspended = await Institution.countDocuments({ status: INSTITUTION_STATUS.SUSPENDED });
    return { total, active, pending, inactive, suspended };
  }

  async _userStats() {
    const [total, byRole, byStatus, last30DaysActive] = await Promise.all([
      mongoose.connection.collection('users').countDocuments(),
      mongoose.connection.collection('users').aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]).toArray(),
      mongoose.connection.collection('users').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
      mongoose.connection.collection('users').countDocuments({
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);
    const roles = {};
    for (const r of byRole) roles[r._id] = r.count;
    const statuses = {};
    for (const r of byStatus) statuses[r._id] = r.count;
    return { total, roles, statuses, last30DaysActive };
  }

  async _databaseStats() {
    try {
      const db = mongoose.connection.db;
      if (!db) return { error: 'Database not connected' };
      const stats = await db.command({ dbStats: 1 });
      const collections = await db.listCollections().toArray();
      return {
        dataSizeBytes: stats.dataSize || 0,
        storageSizeBytes: stats.storageSize || 0,
        indexSizeBytes: stats.indexSize || 0,
        objects: stats.objects || 0,
        collections: collections.length,
        indexes: stats.indexes || 0,
        avgObjectSizeBytes: stats.avgObjSize || 0,
      };
    } catch (_err) {
      return { error: 'Stats unavailable' };
    }
  }

  async _storageEstimate() {
    try {
      const db = mongoose.connection.db;
      if (!db) return null;
      const colls = await db.listCollections().toArray();
      const details = [];
      let totalBytes = 0;
      for (const c of colls) {
        try {
          const s = await db.collection(c.name).stats();
          const size = s.storageSize || s.size || 0;
          totalBytes += size;
          details.push({ name: c.name, sizeBytes: size, count: s.count || 0 });
        } catch (_e) {
          // skip
        }
      }
      return { totalBytes, collections: details };
    } catch (_err) {
      return null;
    }
  }

  async publicStatistics() {
    const [
      totalPublishedCerts,
      totalVerifications,
      authenticCount,
      participatingInstitutions,
    ] = await Promise.all([
      Certificate.countDocuments({ status: CERTIFICATE_STATUS.PUBLISHED }),
      VerificationRecord.countDocuments(),
      VerificationRecord.countDocuments({ status: VERIFICATION_STATUS.AUTHENTIC }),
      Institution.countDocuments({ status: INSTITUTION_STATUS.ACTIVE }),
    ]);

    return {
      totalPublishedCertificates: totalPublishedCerts,
      totalVerifications,
      authenticVerifications: authenticCount,
      participatingInstitutions,
      verificationSuccessRate: totalVerifications > 0
        ? Math.round((authenticCount / totalVerifications) * 100)
        : 0,
      generatedAt: new Date(),
    };
  }
}
