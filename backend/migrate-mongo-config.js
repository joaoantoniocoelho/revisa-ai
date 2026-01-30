import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    options: {},
  },
  migrationsDir: path.join(__dirname, 'migrations'),
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  moduleSystem: 'esm',
};
