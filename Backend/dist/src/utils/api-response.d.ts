import { Response } from 'express';
import { ApiResponseMeta, ApiErrorDetail } from '../types/api.js';
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number, meta?: ApiResponseMeta): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, code?: string, details?: ApiErrorDetail[]): Response;
