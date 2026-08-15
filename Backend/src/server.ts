import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Legal SaaS Backend] Server running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
