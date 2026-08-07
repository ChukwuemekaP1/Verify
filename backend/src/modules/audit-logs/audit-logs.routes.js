import { Router } from 'express';

import { validate } from '../../middlewares/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { authenticate, requireAnyAdmin, requireRole } from '../../middlewares/auth.middleware.js';
import { USER_ROLES } from '../../models/user.model.js';
import {
  exportAuditLogsController,
  getAuditLogController,
  getAuditLogsMetadataController,
  getAuditLogsStatsController,
  getEntityAuditTrailController,
  listAuditLogsController,
} from './audit-logs.controller.js';
import {
  entityAuditTrailSchema,
  getAuditLogSchema,
  listAuditLogsSchema,
} from './audit-logs.service.js';

export const auditLogsRoutes = Router();

auditLogsRoutes.use(authenticate, requireAnyAdmin);

auditLogsRoutes.get('/', validate(listAuditLogsSchema), asyncHandler(listAuditLogsController));
auditLogsRoutes.get('/metadata', asyncHandler(getAuditLogsMetadataController));
auditLogsRoutes.get('/stats', asyncHandler(getAuditLogsStatsController));
auditLogsRoutes.get('/export', asyncHandler(exportAuditLogsController));
auditLogsRoutes.get('/:auditLogId', validate(getAuditLogSchema), asyncHandler(getAuditLogController));
auditLogsRoutes.get(
  '/entity/:entityType/:entityId',
  validate(entityAuditTrailSchema),
  asyncHandler(getEntityAuditTrailController),
);
