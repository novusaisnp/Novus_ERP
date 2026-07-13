import { test as base, expect, type Page } from '@playwright/test';

/**
 * Fixture de autenticação — P16.2 (placeholder).
 * A implementação completa (storageState reutilizável) será feita em P16.3.
 */
export interface E2ECredentials {
  email: string;
  password: string;
}

export const E2E_CREDENTIALS: E2ECredentials = {
  email: process.env.E2E_USER ?? 'e2e@novus.test',
  password: process.env.E2E_PASS ?? 'change-me-in-ci',
};

export async function loginViaUI(page: Page, creds: E2ECredentials = E2E_CREDENTIALS): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(creds.email);
  await page.getByLabel(/senha/i).fill(creds.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|)$/);
}

export const test = base.extend({});
export { expect };
