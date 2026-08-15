"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const PORT = process.env.PORT || 5000;
app_js_1.app.listen(PORT, () => {
    console.log(`[Legal SaaS Backend] Server running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
//# sourceMappingURL=server.js.map