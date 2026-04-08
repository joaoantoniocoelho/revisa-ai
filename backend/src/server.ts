import 'dotenv/config';
import { connectDB } from './shared/config/database.js';
import { createApp } from './app.js';
import { logger } from './shared/logger.js';

const PORT = process.env.PORT ?? 3001;

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught_exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandled_rejection');
  process.exit(1);
});

const shouldSkipDbConnection = process.env.SKIP_DB_CONNECT === 'true';
if (!shouldSkipDbConnection) {
  await connectDB();
}
const app = createApp();

app.listen(PORT);
