import 'dotenv/config';
import { connectDB } from './config/database.js';
import { createApp } from './app.js';

const PORT = process.env.PORT ?? 3001;

const shouldSkipDbConnection = process.env.SKIP_DB_CONNECT === 'true';
if (shouldSkipDbConnection) {
  console.warn('⚠️ SKIP_DB_CONNECT=true, starting without database connection');
} else {
  await connectDB();
}
const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 FRONTEND_URLS: ${process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? 'not configured'}`);
  console.log(
    `🤖 Gemini Model: ${process.env.GEMINI_MODEL ?? 'not configured'}`
  );
  console.log(
    `🗄️  MongoDB: ${process.env.MONGODB_URI ? 'configured' : 'not configured'}`
  );
});
