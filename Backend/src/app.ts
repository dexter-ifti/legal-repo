import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import { sendError } from './utils/api-response.js';

dotenv.config();

export const createApp = (): Express => {
  const app: Express = express();

  // Core Security & Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Base Health & Root Routes
  app.use('/', healthRoutes);
  app.use('/api', healthRoutes);

  // API V1 Feature Routes
  app.use('/api/v1/auth', authRoutes);

  // 404 Fallback Handler
  app.use((_req: Request, res: Response) => {
    return sendError(res, 'Route not found', 404, 'NOT_FOUND');
  });

  // Global Error Handling Middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Error:', err);
    return sendError(res, err.message || 'Internal Server Error', 500, 'INTERNAL_SERVER_ERROR');
  });

  return app;
};

export const app = createApp();
