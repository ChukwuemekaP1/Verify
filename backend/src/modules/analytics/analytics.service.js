import { z } from 'zod';
import { AnalyticsRepository } from './analytics.repository.js';
import { AppError } from '../../shared/errors/app-error.js';
import { USER_ROLES } from '../../models/user.model.js';

export class AnalyticsService {
  constructor({ analyticsRepository }) {
    this.analyticsRepository = analyticsRepository;
  }

  async getDashboard(user) {
    if (!user) throw AppError.unauthorized('Authentication required');
    return this.analyticsRepository.dashboard(user);
  }

  async getSystemStatistics(user) {
    if (!user) throw AppError.unauthorized('Authentication required');
    if (user.role !== USER_ROLES.SUPER_ADMIN) {
      throw AppError.forbidden('System statistics available only to super admin');
    }
    const result = await this.analyticsRepository.systemStatistics(user);
    if (result === null) throw AppError.notFound('Statistics unavailable');
    return result;
  }

  async getPublicStatistics() {
    return this.analyticsRepository.publicStatistics();
  }
}

export const systemStatsSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict(),
});
