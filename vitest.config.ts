import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Default node env keeps the TZ-pinned pure-logic suites fast & deterministic;
    // component tests opt into jsdom per-file via `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
