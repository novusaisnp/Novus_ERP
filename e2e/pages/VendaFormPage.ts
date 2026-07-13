import type { Page } from '@playwright/test';

/** POM placeholder — implementação completa em P16.3 (F2). */
export class VendaFormPage {
  constructor(public readonly page: Page) {}
  async goto(): Promise<void> {
    await this.page.goto('/vendas/vendas');
  }
}
