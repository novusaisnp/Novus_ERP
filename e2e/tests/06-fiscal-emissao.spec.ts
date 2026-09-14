import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';

/**
 * E2E do ciclo de vida da NF-e em modo mockado (FISCAL_MOCK=true).
 *
 * Pré-condições:
 *   - Login como admin (storageState de 01-login.spec.ts — mesmo padrão do resto da suíte).
 *   - Existir venda faturada de teste.
 *
 * O teste apenas verifica que a UI está integrada (botão presente, badge
 * aparece após emissão). Fluxo completo só ativa quando FISCAL_MOCK=false.
 */
const HAS_STATE = fs.existsSync(STORAGE_STATE_PATH);

test.describe('fiscal @mock', () => {
  test.skip(
    !process.env.E2E_FISCAL_ENABLED,
    'defina E2E_FISCAL_ENABLED=1 e seed de venda faturada para rodar este spec',
  );
  test.skip(!HAS_STATE, 'storageState ausente — rode 01-login.spec.ts primeiro.');

  test.use({ storageState: STORAGE_STATE_PATH });

  test('venda faturada exibe ação Emitir NF-e', async ({ page }) => {
    await page.goto('/vendas');
    const linha = page.getByRole('row').filter({ hasText: /faturada/i }).first();
    await linha.getByRole('button', { name: /ações/i }).click();
    await expect(page.getByRole('menuitem', { name: /emitir nf-?e/i })).toBeVisible();
  });

  test('dashboard fiscal carrega KPIs', async ({ page }) => {
    await page.goto('/fiscal/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard fiscal/i })).toBeVisible();
    await expect(page.getByText(/emitidas/i)).toBeVisible();
    await expect(page.getByText(/taxa autorização/i)).toBeVisible();
  });
});
