import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { E2E_CREDENTIALS, STORAGE_STATE_PATH } from '../fixtures/auth.fixture';

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

    // 3 navegações internas (grupo + sub-item, já que a sidebar não usa links)
    await dashboard.navigateTo('Vendas', 'Pedidos', /\/vendas\/pedidos/);
    await dashboard.navigateTo('Financeiro', 'Contas a Receber', /\/financeiro\/contas-receber/);
    await dashboard.navigateTo('Gestão Bancária', 'Bancos', /\/gestao-bancaria\/bancos/);

    await dashboard.logout();

    // Cloudflare Turnstile emite uma marca invisível de instrumentação anti-adulteração
    // (`%c%d font-size:0;color:transparent NaN`) via console.error a cada carregamento do
    // widget — ruído de terceiro, não indica bug da aplicação.
    const errors = (page as unknown as { __consoleErrors: string[] }).__consoleErrors;
    expect(errors.filter((e) => !/favicon|third-party|%c%d.*transparent/i.test(e))).toEqual([]);
  });

  test('login com credenciais inválidas exibe erro e mantém /login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(E2E_CREDENTIALS.email, 'senha-errada-e2e');
    await login.expectError();
  });

  // Roda por ÚLTIMO e propositalmente: `signOut()` no app usa scope 'global'
  // (src/hooks/useAuthenticationState.ts), que revoga TODOS os refresh tokens
  // do usuário no servidor, não só o da aba atual. Se este teste rodasse antes
  // do teste de logout acima, a sessão salva aqui seria revogada por aquele
  // logout mesmo em contexto de browser separado — os specs 02-05 cairiam de
  // volta em /login com um storageState "válido" localmente, porém morto no
  // servidor. Gerar por último garante que nada mais desloga essa sessão depois.
  //
  // rememberMe=true é obrigatório aqui: sem ele, `useSessionPersistence`
  // desloga automaticamente qualquer aba/contexto novo que não tenha passado
  // pelo próprio formulário de login nesta mesma aba (marcador em
  // sessionStorage, que o storageState do Playwright não replica) — exatamente
  // o caso de todo spec 02-05, que carrega a sessão salva num contexto novo.
  test('gera sessão persistida (storageState) para os specs 02-05', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(E2E_CREDENTIALS.email, E2E_CREDENTIALS.password, true);
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });

    fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
    await page.context().storageState({ path: STORAGE_STATE_PATH });
  });
});
