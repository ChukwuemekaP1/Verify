import { getDatabaseStatus } from '../../config/database.js';
import { env } from '../../config/env.js';

export function getHealth(_req, res) {
  const database = getDatabaseStatus();
  const ok = database.label === 'connected' || database.label === 'connecting';

  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    service: 'veriflow-backend',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database,
    modules: ['auth', 'graduates', 'institutions', 'certificates', 'verifications', 'profile'],
  });
}
