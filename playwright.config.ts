import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Runs against a deployed/seeded environment, not the unit-test
 * sandbox. Point it with env vars:
 *   E2E_BASE_URL         - app URL (default http://localhost:3000)
 *   E2E_MANAGER_EMAIL/PW - seeded Manager login   (role-scoped specs)
 *   E2E_CONSULTANT_EMAIL/PW, E2E_CUSTOMER_EMAIL/PW - for RLS-scoping specs
 *
 * Specs that need credentials skip themselves when the env is absent, so the
 * suite is safe to run anywhere; it only exercises what it can authenticate.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
