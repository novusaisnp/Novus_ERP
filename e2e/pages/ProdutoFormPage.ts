import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * POM da tela de cadastro/edição de Produto (via modal em /estoque/produtos).
 * Seletores baseados em data-testids adicionados em P16.3.h.
 */
export class ProdutoFormPage {
  readonly page: Page;
  readonly nomeInput: Locator;
  readonly precoVendaInput: Locator;
  readonly salvarBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nomeInput = page.getByTestId('produto-nome-input');
    this.precoVendaInput = page.getByTestId('produto-preco-venda-input');
    this.salvarBtn = page.getByTestId('produto-salvar-btn');
  }

  async goto(): Promise<void> {
    await this.page.goto('/estoque/produtos');
    await expect(
      this.page.getByRole('heading', { name: /produtos/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  }

  async openNovo(): Promise<void> {
    await this.page.getByRole('button', { name: /novo produto|adicionar produto/i }).first().click();
    await expect(this.nomeInput).toBeVisible({ timeout: 10_000 });
  }

  async preencher(nome: string, precoVenda: number): Promise<void> {
    await this.nomeInput.fill(nome);
    await this.precoVendaInput.fill(String(precoVenda));
  }

  async salvar(): Promise<void> {
    await this.salvarBtn.click();
    // Modal deve fechar ao salvar com sucesso
    await expect(this.nomeInput).toBeHidden({ timeout: 15_000 });
  }

  async esperarNaLista(nome: string): Promise<void> {
    await expect(this.page.getByText(nome, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
  }
}
