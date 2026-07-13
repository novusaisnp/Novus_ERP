import { expect, type Page, type Locator } from '@playwright/test';

/**
 * POM da tela de detalhe/match do Extrato (F3).
 * Rota: /gestao-bancaria/conciliacao/:extratoId
 */
export class ConciliacaoMatchPage {
  constructor(public readonly page: Page) {}

  async waitLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/gestao-bancaria\/conciliacao\/[0-9a-f-]{10,}/, {
      timeout: 20_000,
    });
    await expect(
      this.page.locator('[data-testid^="extrato-linha-"]').first(),
    ).toBeVisible({ timeout: 20_000 });
  }

  /** Retorna o extrato_id inferido pela URL. */
  extratoIdFromUrl(): string | null {
    const m = this.page.url().match(/\/conciliacao\/([0-9a-f-]{10,})/i);
    return m?.[1] ?? null;
  }

  linhas(): Locator {
    return this.page.locator('[data-testid^="extrato-linha-"]:not([data-testid*="status"])');
  }

  async firstLinhaId(): Promise<string> {
    const el = this.linhas().first();
    await expect(el).toBeVisible({ timeout: 15_000 });
    const testId = (await el.getAttribute('data-testid')) ?? '';
    return testId.replace('extrato-linha-', '');
  }

  async selectLinha(linhaId: string): Promise<void> {
    await this.page.getByTestId(`extrato-linha-${linhaId}`).click();
  }

  candidateButtons(): Locator {
    return this.page.locator('[data-testid^="extrato-confirmar-match-btn-"]');
  }

  async confirmarPrimeiroCandidato(): Promise<void> {
    const btn = this.candidateButtons().first();
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await btn.click();
  }

  async criarLancamentoDoExtrato(): Promise<void> {
    this.page.once('dialog', (d) => d.accept());
    await this.page.getByTestId('extrato-criar-lancamento-btn').click();
  }
}
