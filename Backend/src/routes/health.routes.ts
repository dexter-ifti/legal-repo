import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/api-response.js';
import { HealthCheckData } from '../types/api.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const healthData: HealthCheckData = {
    status: 'ok',
    service: 'legal-saas-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  return sendSuccess(res, healthData, 200);
});

router.get('/v1/health', (_req: Request, res: Response) => {
  const healthData: HealthCheckData = {
    status: 'ok',
    service: 'legal-saas-backend-api-v1',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  return sendSuccess(res, healthData, 200);
});

export default router;
