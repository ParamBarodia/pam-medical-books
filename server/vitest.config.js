import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.js'],
    environment: 'node',
    include: ['test/**/*.test.js'],
    testTimeout: 10_000,
    pool: 'forks',     // each test file gets its own DB process
  },
});
