import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export type MovTipo = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';

/**
 * POM da página de Movimentações de Estoque + Nova Movimentação Dialog.
 * Seletores baseados em data-testids adicionados em P16.3.h.
 */
export class EstoqueMovPage {
  readonly page: Page;
  readonly novaBtn: Locator;
  readonly quantidadeInput: Locator;
  readonly confirmarBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.novaBtn = page.getByTestId('estoque-nova-mov-btn');
    this.quantidadeInput = page.getByTestId('estoque-mov-quantidade-input');
    this.confirmarBtn = page.getByTestId('estoque-mov-confirmar-btn');
  }

  async goto(): Promise<void> {
    await this.page.goto('/estoque/movimentacoes');
    await expect(this.novaBtn).toBeVisible({ timeout: 15_000 });
  }

  async abrirNovaMov(tipo: MovTipo): Promise<void> {
    await this.novaBtn.click();
    await expect(this.page.getByTestId(`estoque-mov-tipo-${tipo}`)).toBeVisible({
      timeout: 10_000,
    });
    await this.page.getByTestId(`estoque-mov-tipo-${tipo}`).click();
  }

  /** Seleciona o primeiro produto disponível no combo. */
  async selecionarPrimeiroProduto(): Promise<boolean> {
    const trigger = this.page.getByRole('combobox').first();
    await trigger.click();
    const opt = this.page.getByRole('option').first();
    if ((await opt.count()) === 0) return false;
    await opt.click();
    return true;
  }

  /** Seleciona a primeira localização disponível no combo indicado (origem/destino). */
  async selecionarPrimeiraLocalizacao(label: RegExp): Promise<boolean> {
    const trigger = this.page.getByRole('combobox').filter({ hasText: /selecione/i });
    // fallback: pega o próximo combo aberto após o de produto
    const combo = trigger.first();
    if ((await combo.count()) === 0) return false;
    await combo.click();
    const opt = this.page.getByRole('option').first();
    if ((await opt.count()) === 0) return false;
    await opt.click();
    return true;
  }

  async preencherQuantidade(qtd: number): Promise<void> {
    await this.quantidadeInput.fill(String(qtd));
  }

  async confirmar(): Promise<void> {
    await this.confirmarBtn.click();
    await expect(this.confirmarBtn).toBeHidden({ timeout: 15_000 });
  }
}
