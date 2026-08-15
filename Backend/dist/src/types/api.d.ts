export interface ApiResponseMeta {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
}
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    meta?: ApiResponseMeta;
    timestamp: string;
}
export interface ApiErrorDetail {
    field?: string;
    message: string;
    code?: string;
}
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: ApiErrorDetail[];
    };
    timestamp: string;
}
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
export interface HealthCheckData {
    status: 'ok' | 'degraded' | 'error';
    service: string;
    version: string;
    timestamp: string;
    uptime: number;
}
