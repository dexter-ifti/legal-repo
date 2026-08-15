"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200, meta) {
    const payload = {
        success: true,
        data,
        ...(meta ? { meta } : {}),
        timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(payload);
}
function sendError(res, message, statusCode = 400, code = 'BAD_REQUEST', details) {
    const payload = {
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
//# sourceMappingURL=api-response.js.map