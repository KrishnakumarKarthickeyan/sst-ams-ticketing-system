import { Page, expect } from '@playwright/test';

export interface Creds { email: string; password: string }

export function creds(role: 'MANAGER' | 'CONSULTANT' | 'CUSTOMER' | 'ADMIN'): Creds | null {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PW`];
  return email && password ? { email, password } : null;
}

/** Log in through the real /login form and wait for the dashboard redirect. */
export async function login(page: Page, c: Creds) {
  await page.goto('/login');
  await page.getByPlaceholder(/username@company\.com/i).fill(c.email);
  await page.locator('input[type="password"]').fill(c.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(manager|admin|consultant|customer|dashboard)/, { timeout: 15_000 });
}
