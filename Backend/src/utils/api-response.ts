import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse, ApiResponseMeta, ApiErrorDetail } from '../types/api.js';

export function serializeForJson<T>(value: T): T {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return (Number.isSafeInteger(asNumber) ? asNumber : value.toString()) as T;
  }

  if (value instanceof Date) {
    return value as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item)) as T;
  }

  if (value && typeof value === 'object') {
    // Prisma Decimals (decimal.js instances) — detect by shape, not class
    // name, which bundlers/minifiers can mangle.
    const maybeDecimal = value as { toNumber?: () => number; toFixed?: () => string; toString?: () => string };
    if (
      typeof maybeDecimal.toNumber === 'function' &&
      typeof maybeDecimal.toFixed === 'function' &&
      Object.keys(value).length <= 4
    ) {
      const asNumber = maybeDecimal.toNumber();
      return (Number.isFinite(asNumber) ? asNumber : String(maybeDecimal)) as T;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        serializeForJson(nestedValue),
      ])
    ) as T;
  }

  return value;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponseMeta
): Response {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data: serializeForJson(data),
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: ApiErrorDetail[]
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(payload);
}
