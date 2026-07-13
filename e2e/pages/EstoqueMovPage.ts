import type { Page } from '@playwright/test';

/** POM placeholder — implementação completa em P16.3 (F4). */
export class EstoqueMovPage {
  constructor(public readonly page: Page) {}
  async goto(): Promise<void> {
    await this.page.goto('/estoque/movimentacoes');
  }
}
