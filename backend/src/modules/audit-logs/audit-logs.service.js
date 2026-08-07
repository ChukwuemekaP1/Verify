import { z } from 'zod';
import { AuditLogsRepository } from './audit-logs.repository.js';
import { AppError } from '../../shared/errors/app-error.js';
import { AUDIT_ACTION, AUDIT_ENTITY, AUDIT_SEVERITY } from '../../shared/services/audit-logger.service.js';

export class AuditLogsService {
  constructor({ auditLogsRepository }) {
    this.auditLogsRepository = auditLogsRepository;
  }

  async listAuditLogs(filters, user) {
    return this.auditLogsRepository.list(filters, user);
  }

  async getAuditLog(auditLogId, user) {
    const log = await this.auditLogsRepository.findById(auditLogId, user);
    if (!log) throw AppError.notFound('Audit log entry not found');
    return { auditLog: log };
  }

  async getEntityAuditTrail(entityType, entityId, filters, user) {
    const allowedEntities = Object.values(AUDIT_ENTITY);
    if (!allowedEntities.includes(entityType)) {
      throw AppError.badRequest(`Invalid entity type. Allowed: ${allowedEntities.join(', ')}`);
    }
    return this.auditLogsRepository.findForEntity(entityType, entityId, filters, user);
  }

  async getAuditLogsStats(user) {
    return this.auditLogsRepository.stats(user);
  }

  async getMetadata() {
    return {
      actions: Object.values(AUDIT_ACTION),
      entityTypes: Object.values(AUDIT_ENTITY),
      severities: Object.values(AUDIT_SEVERITY),
    };
  }

  async exportAuditLogs(user, filters = {}) {
    const items = await this.auditLogsRepository.exports(user, filters);
    return {
      count: items.length,
      exportedAt: new Date(),
      format: 'json',
      items,
    };
  }
}

export const listAuditLogsSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    action: z.string().trim().optional(),
    entityType: z.string().trim().optional(),
    entityId: z.string().trim().optional(),
    actor: z.string().trim().optional(),
    severity: z.string().trim().optional(),
    success: z.enum(['true', 'false']).optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    search: z.string().trim().optional(),
  }),
  body: z.object({}).strict(),
});

export const getAuditLogSchema = z.object({
  params: z.object({ auditLogId: z.string().trim().min(1) }),
  query: z.object({}).strict(),
  body: z.object({}).strict(),
});

export const entityAuditTrailSchema = z.object({
  params: z.object({
    entityType: z.string().trim().min(1),
    entityId: z.string().trim().min(1),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    action: z.string().trim().optional(),
    severity: z.string().trim().optional(),
  }),
  body: z.object({}).strict(),
});
