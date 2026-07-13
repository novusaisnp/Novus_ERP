import { expect, type Page } from '@playwright/test';
import path from 'node:path';

/**
 * POM da tela de Importação de Extrato Bancário (F3).
 * Rota: /gestao-bancaria/conciliacao/importar
 */
export class ConciliacaoImportPage {
  constructor(public readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/gestao-bancaria/conciliacao/importar');
    await expect(
      this.page.getByRole('heading', { name: /importar extrato/i }),
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Seleciona a primeira conta bancária disponível no combo. Retorna o id selecionado. */
  async selectFirstConta(): Promise<string> {
    const trigger = this.page.getByTestId('extrato-conta-select');
    await trigger.click();
    const firstOption = this.page
      .locator('[data-testid^="extrato-conta-option-"]')
      .first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });
    const testId = (await firstOption.getAttribute('data-testid')) ?? '';
    const id = testId.replace('extrato-conta-option-', '');
    await firstOption.click();
    return id;
  }

  async selectContaById(contaId: string): Promise<void> {
    await this.page.getByTestId('extrato-conta-select').click();
    await this.page.getByTestId(`extrato-conta-option-${contaId}`).click();
  }

  async setFile(absolutePath: string): Promise<void> {
    await this.page.getByTestId('extrato-file-input').setInputFiles(absolutePath);
  }

  async submit(): Promise<void> {
    await this.page.getByTestId('extrato-importar-btn').click();
  }

  /** Faz upload de um asset em e2e/assets e submete. */
  async importAsset(relativeAsset: string): Promise<void> {
    const abs = path.resolve(process.cwd(), 'e2e/assets', relativeAsset);
    await this.setFile(abs);
    await this.submit();
  }
}
