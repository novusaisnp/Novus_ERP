import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

export type TipoRegra = 'PALAVRA_CHAVE' | 'VALOR_EXATO' | 'REGEX' | 'CONTRAPARTE';

const TIPO_LABEL: Record<TipoRegra, RegExp> = {
  PALAVRA_CHAVE: /palavra-?chave/i,
  VALOR_EXATO: /valor exato/i,
  REGEX: /express[aã]o regular/i,
  CONTRAPARTE: /contraparte/i,
};

/**
 * POM do modal de criação/edição de Regra de Conciliação.
 */
export class RegraFormPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly inputNome: Locator;
  readonly selectTipo: Locator;
  readonly inputPadrao: Locator;
  readonly btnSalvar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByTestId('dialog-regra');
    this.inputNome = page.getByTestId('regra-input-nome');
    this.selectTipo = page.getByTestId('regra-select-tipo');
    this.inputPadrao = page.getByTestId('regra-input-padrao');
    this.btnSalvar = page.getByTestId('btn-salvar-regra');
  }

  async esperarAberto(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 10_000 });
  }

  async setNome(nome: string): Promise<void> {
    await this.inputNome.fill(nome);
  }

  async setTipo(tipo: TipoRegra): Promise<void> {
    await this.selectTipo.click();
    await this.page.getByRole('option', { name: TIPO_LABEL[tipo] }).click();
  }

  async setPadrao(padrao: string): Promise<void> {
    await expect(this.inputPadrao).toBeVisible();
    await this.inputPadrao.fill(padrao);
  }

  async salvar(): Promise<void> {
    await this.btnSalvar.click();
    await expect(this.dialog).toBeHidden({ timeout: 10_000 });
  }
}
