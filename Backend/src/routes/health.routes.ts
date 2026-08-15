import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/api-response.js';
import { HealthCheckData } from '../types/api.js';
import { checkDatabaseHealth } from '../db/health.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  const healthData: HealthCheckData = {
    status: dbHealth.connected ? 'ok' : 'degraded',
    service: 'legal-saas-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
  };

  const statusCode = dbHealth.connected ? 200 : 200; // Return 200 degraded or 503 if strict, keep 200 for health reporting
  return sendSuccess(res, healthData, statusCode);
});

router.get('/v1/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  const healthData: HealthCheckData = {
    status: dbHealth.connected ? 'ok' : 'degraded',
    service: 'legal-saas-backend-api-v1',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
  };

  return sendSuccess(res, healthData, 200);
});

export default router;
