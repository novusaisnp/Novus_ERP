import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorToast: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/e-?mail/i);
    this.passwordInput = page.getByLabel(/senha/i);
    this.submitButton = page.getByRole('button', { name: /entrar/i });
    this.errorToast = page.getByText(/credenciais|inválid|erro no login/i);
    this.rememberMeCheckbox = page.getByLabel(/lembrar-me/i);
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.emailInput).toBeVisible();
  }

  /**
   * `rememberMe` precisa ser true para gerar um storageState reutilizável por
   * outros specs: sem isso, `useSessionPersistence` desloga a sessão no
   * primeiro mount de qualquer aba/contexto novo que não passou pelo próprio
   * formulário de login (ver src/hooks/useSessionPersistence.ts).
   */
  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    await this.submitButton.click();
  }

  async expectError(): Promise<void> {
    await expect(this.errorToast.first()).toBeVisible({ timeout: 10_000 });
    await expect(this.page).toHaveURL(/\/login/);
  }
}
