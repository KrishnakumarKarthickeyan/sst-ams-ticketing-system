import { test, expect } from '@playwright/test';

/**
 * Unauthenticated smoke — runs anywhere with just E2E_BASE_URL (no creds).
 * Proves middleware protects routes and the login surface renders.
 */
test.describe('smoke (no auth)', () => {
  test('a protected route redirects to /login', async ({ page }) => {
    await page.goto('/manager/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('the login form renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
