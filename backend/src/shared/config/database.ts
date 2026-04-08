import mongoose from 'mongoose';
import { logger } from '../logger.js';

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('DB URI is not defined');
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.fatal({ event: 'db_connection_failed', message }, 'db_connection_failed');
    process.exit(1);
  }
};
