import { AuditLog, AUDIT_ACTION, AUDIT_ENTITY, AUDIT_SEVERITY } from '../../models/audit-log.model.js';
import { logger } from '../../config/logger.js';

export class AuditLogger {
  static async log({
    action,
    entityType,
    entityId = null,
    entityLabel = null,
    severity = AUDIT_SEVERITY.INFO,
    actor = null,
    actorLabel = null,
    actorRole = null,
    institution = null,
    changes = {},
    previousValues = {},
    newValues = {},
    ipAddress = null,
    userAgent = null,
    requestId = null,
    success = true,
    errorMessage = null,
    metadata = {},
  }) {
    try {
      const log = new AuditLog({
        action,
        entityType,
        entityId,
        entityLabel,
        severity,
        actor,
        actorLabel,
        actorRole,
        institution,
        changes,
        previousValues,
        newValues,
        ipAddress,
        userAgent,
        requestId,
        success,
        errorMessage,
        metadata,
      });
      await log.save();
      return log;
    } catch (err) {
      logger.error(
        { err, action, entityType, entityId },
        'Failed to persist audit log entry',
      );
      return null;
    }
  }

  static forRequest(req) {
    const requestId = req.headers['x-request-id'] || null;
    const ipAddress =
      req.ip ||
      req.connection?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      null;
    const userAgent = req.headers['user-agent'] || null;
    const user = req.user || null;
    const institution = user?.institution?._id ?? user?.institution ?? null;

    return {
      actor: user?._id ?? null,
      actorLabel: user?.fullName || (user ? `${user.firstName} ${user.lastName}` : null),
      actorRole: user?.role || null,
      institution,
      ipAddress,
      userAgent,
      requestId,
    };
  }

  static async certificate(req, { action, entityId, entityLabel, severity, previousValues = {}, newValues = {}, success = true, errorMessage = null, metadata = {} }) {
    return AuditLogger.log({
      action,
      entityType: AUDIT_ENTITY.CERTIFICATE,
      entityId,
      entityLabel,
      severity,
      previousValues,
      newValues,
      success,
      errorMessage,
      metadata,
      ...AuditLogger.forRequest(req),
    });
  }

  static async graduate(req, { action, entityId, entityLabel, severity, previousValues = {}, newValues = {}, success = true, errorMessage = null, metadata = {} }) {
    return AuditLogger.log({
      action,
      entityType: AUDIT_ENTITY.GRADUATE,
      entityId,
      entityLabel,
      severity,
      previousValues,
      newValues,
      success,
      errorMessage,
      metadata,
      ...AuditLogger.forRequest(req),
    });
  }

  static async institution(req, { action, entityId, entityLabel, severity, previousValues = {}, newValues = {}, success = true, errorMessage = null, metadata = {} }) {
    return AuditLogger.log({
      action,
      entityType: AUDIT_ENTITY.INSTITUTION,
      entityId,
      entityLabel,
      severity,
      previousValues,
      newValues,
      success,
      errorMessage,
      metadata,
      ...AuditLogger.forRequest(req),
    });
  }

  static async user(req, { action, entityId, entityLabel, severity, previousValues = {}, newValues = {}, success = true, errorMessage = null, metadata = {} }) {
    return AuditLogger.log({
      action,
      entityType: AUDIT_ENTITY.USER,
      entityId,
      entityLabel,
      severity,
      previousValues,
      newValues,
      success,
      errorMessage,
      metadata,
      ...AuditLogger.forRequest(req),
    });
  }

  static async verification(req, { action = AUDIT_ACTION.VERIFY, entityId, entityLabel, severity = AUDIT_SEVERITY.INFO, previousValues = {}, newValues = {}, success = true, errorMessage = null, metadata = {} }) {
    return AuditLogger.log({
      action,
      entityType: AUDIT_ENTITY.VERIFICATION,
      entityId,
      entityLabel,
      severity,
      previousValues,
      newValues,
      success,
      errorMessage,
      metadata,
      ...AuditLogger.forRequest(req),
    });
  }

  static async system({ action, severity, entityLabel, metadata = {}, success = true, errorMessage = null }) {
    return AuditLogger.log({
      action,
      entityType: AUDIT_ENTITY.SYSTEM,
      entityLabel,
      severity,
      metadata,
      success,
      errorMessage,
    });
  }
}

export { AUDIT_ACTION, AUDIT_ENTITY, AUDIT_SEVERITY };
