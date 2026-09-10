import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * POM de liquidação de título — a ação de liquidar não vive em
 * /financeiro/contas-receber (essa tela só edita/exclui o cadastro do título,
 * sem nenhuma ação de liquidação); vive em /financeiro/movimentacoes
 * ("Movimentações Financeiras" → aba "Lista de Títulos"), onde o botão com o
 * ícone CreditCard (data-testid="titulo-liquidar-icon-btn") abre o modal de
 * liquidação diretamente (src/components/financeiro/MovimentacoesModal.tsx).
 */
export class ContasReceberPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/financeiro/movimentacoes');
    await expect(this.page.getByRole('heading', { name: /movimentações financeiras/i })).toBeVisible({
      timeout: 15_000,
    });
  }

  async liquidar(termo: string, valor: string): Promise<void> {
    const card = this.page.locator('.cursor-pointer', { hasText: termo });
    await card.getByTestId('titulo-liquidar-icon-btn').click();

    // Forma de pagamento default é "Dinheiro" — liquidação em dinheiro não
    // exige (nem cria) movimentação bancária de verdade, por design: pagamento
    // em espécie não passa por conta bancária (ver `necessitaContaBancaria` em
    // LiquidacaoTituloModal.tsx). Testar via PIX/Transferência exigiria seed de
    // banco + agência + conta bancária (listarContasBancariasAtivasComAgenciaBanco
    // faz INNER JOIN em agencias_bancarias) — fora do escopo aqui; o essencial
    // (baixa do título, saldo zerado) já é validado via contas_receber.

    const valorInput = this.page.getByTestId('liquidacao-valor-input');
    await expect(valorInput).toBeVisible();
    await valorInput.fill(valor);

    // O modal (Dialog fixo, maior que o viewport de teste) nunca reporta o
    // botão de confirmar como dentro do viewport, mesmo após scrollIntoView —
    // é um <button type="submit">, então Enter no campo de valor submete o
    // form sem depender de clicar um elemento fora da área visível.
    await valorInput.press('Enter');
  }
}
