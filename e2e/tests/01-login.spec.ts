import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { E2E_CREDENTIALS } from '../fixtures/auth.fixture';

const HAS_CREDS = !!process.env.E2E_PASS;

test.describe('F1 - Login & Navegação Base', () => {
  test.skip(!HAS_CREDS, 'E2E_PASS não configurada no ambiente.');

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    (page as unknown as { __consoleErrors: string[] }).__consoleErrors = errors;
  });

  test('login com credenciais válidas + navegação + logout', async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.login(E2E_CREDENTIALS.email, E2E_CREDENTIALS.password);

    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
    await expect(dashboard.sidebar).toBeVisible();

    // 3 navegações internas
    await dashboard.navigateTo(/^vendas$/i, /\/vendas/);
    await dashboard.navigateTo(/contas a receber/i, /\/financeiro\/contas-receber/);
    await dashboard.navigateTo(/^bancos$/i, /\/gestao-bancaria\/bancos/);

    await dashboard.logout();

    const errors = (page as unknown as { __consoleErrors: string[] }).__consoleErrors;
    expect(errors.filter((e) => !/favicon|third-party/i.test(e))).toEqual([]);
  });

  test('login com credenciais inválidas exibe erro e mantém /login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(E2E_CREDENTIALS.email, 'senha-errada-e2e');
    await login.expectError();
  });
});
