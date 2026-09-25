import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    setupFiles: ['./src/test/setup-env.ts'],
    // Every file shares one test database and truncates it, so files must not run concurrently.
    fileParallelism: false,
  },
});
