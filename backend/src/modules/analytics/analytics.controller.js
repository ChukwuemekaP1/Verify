import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';

const analyticsService = new AnalyticsService({
  analyticsRepository: new AnalyticsRepository(),
});

export async function getDashboardController(req, res) {
  const result = await analyticsService.getDashboard(req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getSystemStatisticsController(req, res) {
  const result = await analyticsService.getSystemStatistics(req.user);
  res.status(200).json({ status: 'success', data: result });
}

export async function getPublicStatisticsController(_req, res) {
  const result = await analyticsService.getPublicStatistics();
  res.status(200).json({ status: 'success', data: result });
}
