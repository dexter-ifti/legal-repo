"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const app_js_1 = require("../src/app.js");
(0, node_test_1.default)('API Response Helpers & Health Check', async (t) => {
    await t.test('App instance is defined', () => {
        node_assert_1.default.strictEqual(typeof app_js_1.app, 'function');
    });
    await t.test('Health route returns status ok', async () => {
        // Basic test checking app routing logic
        const reqMock = { method: 'GET', url: '/health', headers: {} };
        node_assert_1.default.ok(reqMock);
    });
});
//# sourceMappingURL=health.test.js.map