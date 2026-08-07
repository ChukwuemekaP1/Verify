import { AuditLogsRepository } from './audit-logs.repository.js';
import { AuditLogsService } from './audit-logs.service.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';

const auditLogsService = new AuditLogsService({
  auditLogsRepository: new AuditLogsRepository(),
});

export async function listAuditLogsController(req, res) {
  const result = await auditLogsService.listAuditLogs(req.query, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getAuditLogController(req, res) {
  const result = await auditLogsService.getAuditLog(req.params.auditLogId, req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getEntityAuditTrailController(req, res) {
  const result = await auditLogsService.getEntityAuditTrail(
    req.params.entityType,
    req.params.entityId,
    req.query,
    req.user,
  );
  res.status(200).json({ status: 'success', data: result });
}

export async function getAuditLogsStatsController(req, res) {
  const result = await auditLogsService.getAuditLogsStats(req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getAuditLogsMetadataController(_req, res) {
  const result = await auditLogsService.getMetadata();
  res.status(200).json({ status: 'success', data: result });
}

export async function exportAuditLogsController(req, res) {
  const result = await auditLogsService.exportAuditLogs(req.user, req.query);
  res.status(200).json({ status: 'success', data: result });
}
