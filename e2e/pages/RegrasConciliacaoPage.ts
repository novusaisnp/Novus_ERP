import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * POM da página de listagem de Regras de Conciliação.
 * Rota: /gestao-bancaria/conciliacao/regras
 */
export class RegrasConciliacaoPage {
  readonly page: Page;
  readonly btnNova: Locator;
  readonly tabela: Locator;

  constructor(page: Page) {
    this.page = page;
    this.btnNova = page.getByTestId('btn-nova-regra');
    this.tabela = page.getByTestId('tabela-regras');
  }

  async goto(): Promise<void> {
    await this.page.goto('/gestao-bancaria/conciliacao/regras');
    await expect(this.btnNova).toBeVisible({ timeout: 15_000 });
  }

  async openNova(): Promise<void> {
    await this.btnNova.click();
  }

  linhaPorNome(nome: string): Locator {
    return this.page.locator(`[data-testid^="regra-row-"]`, {
      has: this.page.getByText(nome, { exact: true }),
    });
  }

  async esperarLinha(nome: string): Promise<void> {
    await expect(this.linhaPorNome(nome).first()).toBeVisible({ timeout: 10_000 });
  }

  async esperarSemLinha(nome: string): Promise<void> {
    await expect(this.linhaPorNome(nome)).toHaveCount(0, { timeout: 10_000 });
  }

  async editar(nome: string): Promise<void> {
    const row = this.linhaPorNome(nome).first();
    await row.getByRole('button', { name: /editar/i }).click();
  }

  async excluir(nome: string): Promise<void> {
    const row = this.linhaPorNome(nome).first();
    await row.getByRole('button', { name: /excluir/i }).click();
    // Confirmação global (ConfirmDeleteWithDeps)
    const confirmar = this.page
      .getByRole('button', { name: /^(excluir|confirmar)/i })
      .last();
    await confirmar.click();
  }
}
