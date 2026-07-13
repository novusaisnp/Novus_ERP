import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * POM de Contas a Receber — filtra por busca e aciona liquidação.
 */
export class ContasReceberPage {
  readonly page: Page;
  readonly buscaInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.buscaInput = page.getByTestId('contas-receber-busca-input');
  }

  async goto(): Promise<void> {
    await this.page.goto('/financeiro/contas-receber');
    await expect(this.buscaInput).toBeVisible({ timeout: 15_000 });
  }

  async filtrarPor(termo: string): Promise<void> {
    await this.buscaInput.fill(termo);
  }

  async abrirGestaoDaLinha(termo: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(termo, 'i') }).first();
    await row.click();
  }

  async liquidar(valor: string): Promise<void> {
    await this.page.getByTestId('titulo-liquidar-btn').click();
    const valorInput = this.page.getByTestId('liquidacao-valor-input');
    await expect(valorInput).toBeVisible();
    await valorInput.fill(valor);
    await this.page.getByTestId('liquidacao-confirmar-btn').click();
  }
}
