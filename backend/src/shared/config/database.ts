import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }
    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    const host = mongoose.connection.host;
    const dbName = mongoose.connection.name;
    console.log(`[DB] Connected to MongoDB — host: ${host}, database: ${dbName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DB] Failed to connect to MongoDB: ${message}`);
    process.exit(1);
  }
};
