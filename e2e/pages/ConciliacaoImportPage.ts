import type { Page } from '@playwright/test';

/** POM placeholder — implementação completa em P16.3 (F3). */
export class ConciliacaoImportPage {
  constructor(public readonly page: Page) {}
  async goto(): Promise<void> {
    await this.page.goto('/gestao-bancaria/conciliacao/importar');
  }
}
