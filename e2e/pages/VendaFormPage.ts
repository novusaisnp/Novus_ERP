import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * POM da tela de Vendas — usa data-testids adicionados em P16.3.c.
 */
export class VendaFormPage {
  readonly page: Page;
  readonly novaVendaButton: Locator;
  readonly clienteSelect: Locator;
  readonly adicionarItemButton: Locator;
  readonly salvarButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.novaVendaButton = page.getByRole('button', { name: /nova venda/i });
    this.clienteSelect = page.getByTestId('venda-cliente-select');
    this.adicionarItemButton = page.getByTestId('venda-adicionar-item-btn');
    this.salvarButton = page.getByTestId('venda-salvar-btn');
  }

  async goto(): Promise<void> {
    await this.page.goto('/vendas/pedidos');
  }

  async openNovaVenda(): Promise<void> {
    await this.novaVendaButton.first().click();
    await expect(this.clienteSelect).toBeVisible();
  }

  async selectCliente(nome: string): Promise<void> {
    await this.clienteSelect.click();
    await this.page.getByRole('option', { name: new RegExp(nome, 'i') }).first().click();
  }

  async fillItem(index: number, descricao: string, quantidade: number): Promise<void> {
    await this.page.getByTestId(`venda-item-descricao-input-${index}`).fill(descricao);
    const qtd = this.page.getByTestId(`venda-item-qtd-input-${index}`);
    await qtd.fill(String(quantidade));
  }

  async save(): Promise<void> {
    await this.salvarButton.click();
  }
}
