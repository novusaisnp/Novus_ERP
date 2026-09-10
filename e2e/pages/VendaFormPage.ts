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

  /**
   * O campo de descrição do item deixou de ser um input livre — hoje é o
   * CatalogoItemPicker, um combobox que busca produto/serviço real no catálogo
   * (src/components/vendas/CatalogoItemPicker.tsx). Para um produto fictício de
   * teste (que não existe no catálogo), o próprio componente oferece o fallback
   * "Usar '<busca>' como descrição livre", que é o que preserva o comportamento
   * original do teste (descrição arbitrária + preço preenchido manualmente).
   *
   * `role="combobox"` NÃO recebe nome acessível do próprio conteúdo textual (ao
   * contrário de `button`) — getByRole(..., { name }) nunca casa aqui mesmo com
   * "Buscar produto..." visível. `.filter({ hasText })` compara o texto
   * renderizado direto, contornando essa regra de ARIA.
   */
  async fillItem(index: number, descricao: string, quantidade: number, precoUnitario: number): Promise<void> {
    await this.page.getByRole('combobox').filter({ hasText: /buscar produto/i }).first().click();
    await this.page.getByPlaceholder(/buscar por código ou nome/i).fill(descricao);
    await this.page.getByRole('button', { name: new RegExp(`usar.*${descricao}.*como descrição livre`, 'i') }).click();

    const qtd = this.page.getByTestId(`venda-item-qtd-input-${index}`);
    await qtd.fill(String(quantidade));

    // "Preço Unit." (CurrencyInput, src/components/ui/currency-input.tsx) não tem
    // <label htmlFor> nem id — getByLabel nunca encontra. Localiza pelo texto do
    // rótulo vizinho. A máscara trata os dígitos digitados como CENTAVOS, então
    // fill precisa do valor em centavos (ex.: R$100,00 → '10000').
    const precoWrapper = this.page.locator('div').filter({ hasText: /^Preço Unit\.$/ });
    await precoWrapper.locator('input').fill(String(Math.round(precoUnitario * 100)));
  }

  async save(): Promise<void> {
    await this.salvarButton.click();
  }
}
