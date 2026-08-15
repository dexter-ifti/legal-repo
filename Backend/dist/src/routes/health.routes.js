"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_response_js_1 = require("../utils/api-response.js");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    const healthData = {
        status: 'ok',
        service: 'legal-saas-backend',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    };
    return (0, api_response_js_1.sendSuccess)(res, healthData, 200);
});
router.get('/v1/health', (_req, res) => {
    const healthData = {
        status: 'ok',
        service: 'legal-saas-backend-api-v1',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    };
    return (0, api_response_js_1.sendSuccess)(res, healthData, 200);
});
exports.default = router;
//# sourceMappingURL=health.routes.js.map