import { Router } from 'express';

import { authRoutes } from '../modules/auth/auth.routes.js';
import { certificatesRoutes } from '../modules/certificates/certificates.routes.js';
import { graduatesRoutes } from '../modules/graduates/graduates.routes.js';
import { healthRoutes } from '../modules/health/health.routes.js';
import { institutionsRoutes } from '../modules/institutions/institutions.routes.js';
import { profileRoutes } from '../modules/profile/profile.routes.js';
import { verificationsRoutes } from '../modules/verifications/verifications.routes.js';
import { auditLogsRoutes } from '../modules/audit-logs/audit-logs.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';
import { uploadsRoutes } from '../modules/uploads/uploads.routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/graduates', graduatesRoutes);
apiRouter.use('/institutions', institutionsRoutes);
apiRouter.use('/certificates', certificatesRoutes);
apiRouter.use('/verifications', verificationsRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/audit-logs', auditLogsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/uploads', uploadsRoutes);
