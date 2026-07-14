import { test, expect } from '@playwright/test';

/**
 * E2E do ciclo de vida da NF-e em modo mockado (FISCAL_MOCK=true).
 *
 * Pré-condições:
 *   - Login como admin.
 *   - Existir venda faturada de teste.
 *
 * O teste apenas verifica que a UI está integrada (botão presente, badge
 * aparece após emissão). Fluxo completo só ativa quando FISCAL_MOCK=false.
 */
test.describe('fiscal @mock', () => {
  test.skip(
    !process.env.E2E_FISCAL_ENABLED,
    'defina E2E_FISCAL_ENABLED=1 e seed de venda faturada para rodar este spec',
  );

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
