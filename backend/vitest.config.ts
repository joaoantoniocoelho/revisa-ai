import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    maxConcurrency: 1,
    sequence: {
      concurrent: false,
    },
  },
});
