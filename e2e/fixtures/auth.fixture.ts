import { test as base, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Fixture de autenticação — P16.3.
 * Realiza login uma vez via UI e persiste storageState em disco
 * para reaproveitamento entre specs. Nunca loga credenciais.
 */
export interface E2ECredentials {
  email: string;
  password: string;
}

export const E2E_CREDENTIALS: E2ECredentials = {
  email: process.env.E2E_USER ?? 'e2e@novus.test',
  password: process.env.E2E_PASS ?? '',
};

export const STORAGE_STATE_PATH = path.resolve(
  process.cwd(),
  'e2e/.auth/user.json',
);

export async function loginViaUI(
  page: Page,
  creds: E2ECredentials = E2E_CREDENTIALS,
): Promise<void> {
  if (!creds.password) {
    throw new Error('E2E_PASS não configurada — não é possível autenticar.');
  }
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(creds.email);
  await page.getByLabel(/senha/i).fill(creds.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
}

export async function ensureStorageState(page: Page): Promise<string> {
  const dir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(STORAGE_STATE_PATH)) return STORAGE_STATE_PATH;
  await loginViaUI(page);
  await page.context().storageState({ path: STORAGE_STATE_PATH });
  return STORAGE_STATE_PATH;
}

export const test = base.extend({});
export { expect };
