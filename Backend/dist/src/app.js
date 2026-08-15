"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const health_routes_js_1 = __importDefault(require("./routes/health.routes.js"));
const api_response_js_1 = require("./utils/api-response.js");
dotenv_1.default.config();
const createApp = () => {
    const app = (0, express_1.default)();
    // Core Security & Middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Base Health & Root Routes
    app.use('/', health_routes_js_1.default);
    app.use('/api', health_routes_js_1.default);
    // 404 Fallback Handler
    app.use((_req, res) => {
        return (0, api_response_js_1.sendError)(res, 'Route not found', 404, 'NOT_FOUND');
    });
    // Global Error Handling Middleware
    app.use((err, _req, res, _next) => {
        console.error('Unhandled Error:', err);
        return (0, api_response_js_1.sendError)(res, err.message || 'Internal Server Error', 500, 'INTERNAL_SERVER_ERROR');
    });
    return app;
};
exports.createApp = createApp;
exports.app = (0, exports.createApp)();
//# sourceMappingURL=app.js.map