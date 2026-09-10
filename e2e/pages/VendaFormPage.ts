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

  /**
   * Sem plano de pagamento selecionado, a venda salva normalmente mas
   * `gerar_contas_receber_da_venda` não encontra parcela elegível (títulos vêm
   * de `venda_pagamento`/`venda_pagamento_parcelas`, não são derivados direto
   * dos itens) — "gerar títulos" reporta sucesso com 0 gerados, silenciosamente.
   */
  async selectPlanoPagamento(nome: string): Promise<void> {
    await this.page.getByRole('combobox').filter({ hasText: /selecione um plano/i }).click();
    await this.page.getByRole('option', { name: new RegExp(nome, 'i') }).first().click();
  }

  async save(): Promise<void> {
    await this.salvarButton.click();
  }

  /**
   * `VendaPagamentoSection` (src/components/vendas/VendaFormModal.tsx, linha ~478)
   * só renderiza quando `venda?.id` existe — ou seja, nunca no modal de criação
   * (que fecha sozinho após salvar, `onOpenChange(false)` incondicional). É
   * preciso reabrir a venda já salva em modo edição pra registrar o pagamento.
   * Sem isso, `gerar_contas_receber_da_venda` nunca acha parcela elegível
   * (`venda_pagamento`/`venda_pagamento_parcelas` ficam vazias) — "Gerar
   * títulos" reporta sucesso silencioso com 0 gerados, sem indicar o motivo.
   */
  async abrirEdicao(nomeCliente: string): Promise<void> {
    const row = this.page.getByRole('row').filter({ hasText: nomeCliente }).first();
    await row.getByTestId('venda-editar-btn').click();
    await expect(this.clienteSelect).toBeVisible();
  }

  async registrarPagamento(valorTotal: number): Promise<void> {
    await this.page.getByRole('combobox').filter({ hasText: /^Selecione…$/ }).first().click();
    await this.page.getByRole('option').first().click();

    const valorWrapper = this.page.locator('div').filter({ hasText: /^Valor \(R\$\)$/ });
    await valorWrapper.locator('input').fill(String(Math.round(valorTotal * 100)));

    await this.page.getByRole('button', { name: /adicionar pagamento/i }).click();
    await expect(this.page.getByText(/restante/i)).toBeVisible();
  }

  async fecharModal(): Promise<void> {
    await this.page.getByRole('button', { name: /^cancelar$/i }).click();
  }
}
