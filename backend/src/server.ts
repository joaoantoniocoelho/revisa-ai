import 'dotenv/config';
import { connectDB } from './shared/config/database.js';
import { createApp } from './app.js';

const PORT = process.env.PORT ?? 3001;

const shouldSkipDbConnection = process.env.SKIP_DB_CONNECT === 'true';
if (!shouldSkipDbConnection) {
  await connectDB();
}
const app = createApp();

app.listen(PORT);
