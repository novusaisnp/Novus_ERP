import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { E2E_CREDENTIALS } from '../fixtures/auth.fixture';

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

  private linha(termo: string) {
    return this.page.locator('.cursor-pointer', { hasText: termo });
  }

  /**
   * Liquidação total ou parcial — mesmo modal (`LiquidacaoTituloModal`), só
   * muda o valor preenchido. Forma de pagamento default é "Dinheiro" — não
   * exige (nem cria) movimentação bancária de verdade, por design: pagamento
   * em espécie não passa por conta bancária (`necessitaContaBancaria` em
   * LiquidacaoTituloModal.tsx). Testar via PIX/Transferência exigiria seed de
   * banco + agência + conta bancária (`listarContasBancariasAtivasComAgenciaBanco`
   * faz INNER JOIN em agencias_bancarias) — fora do escopo aqui.
   */
  async liquidar(termo: string, valor: string): Promise<void> {
    await this.linha(termo).getByTestId('titulo-liquidar-icon-btn').click();

    const valorInput = this.page.getByTestId('liquidacao-valor-input');
    await expect(valorInput).toBeVisible();
    await valorInput.fill(valor);

    // O modal (Dialog fixo, maior que o viewport de teste) nunca reporta o
    // botão de confirmar como dentro do viewport, mesmo após scrollIntoView —
    // é um <button type="submit">, então Enter no campo de valor submete o
    // form sem depender de clicar um elemento fora da área visível.
    await valorInput.press('Enter');
  }

  /**
   * Abre "Gestão do Título" (MovimentacoesGestaoPopup) — ícone de olho na
   * linha, primeiro botão da linha (o de liquidar direto é o segundo). É daí
   * que saem Estornar/Renegociar/Editar/Cancelar — não vivem na linha da lista.
   */
  async abrirGestao(termo: string): Promise<void> {
    await this.linha(termo).getByRole('button').first().click();
    await expect(this.page.getByRole('heading', { name: /gestão do título/i })).toBeVisible({
      timeout: 10_000,
    });
  }

  /**
   * Cancelamento e estorno exigem uma segunda autorização (gate do FIN-0:
   * e-mail + senha + justificativa de um "autorizador", registrado pra
   * auditoria) — incondicional, não é algo que dependa do título. Autoriza
   * com a própria conta e2e@novus.test (é o admin do tenant de teste; time
   * decidiu que autoautorizar aqui é aceitável, diferente de preencher
   * credencial de um usuário real em nome de alguém).
   */
  private async autorizarComSegundaSenha(justificativa: string): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: /autorização necessária/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByLabel(/e-mail do autorizador/i).fill(E2E_CREDENTIALS.email);
    await dialog.getByLabel(/^senha$/i).fill(E2E_CREDENTIALS.password);
    await dialog.getByLabel(/justificativa/i).fill(justificativa);
    await dialog.getByRole('button', { name: /^autorizar$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  }

  async estornar(motivo: string): Promise<void> {
    await this.page.getByRole('button', { name: /^estornar$/i }).click();
    const dialog = this.page.getByRole('dialog', { name: /estornar baixa/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByLabel(/motivo do estorno/i).fill(motivo);
    await dialog.getByRole('button', { name: /confirmar estorno/i }).click();
    await this.autorizarComSegundaSenha(motivo);
    // O botão fica "Estornando..." em voo — só o fechamento do dialog original
    // confirma sucesso de verdade, depois da autorização acima.
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  }

  async cancelar(motivo: string): Promise<void> {
    await this.page.getByRole('button', { name: /^cancelar$/i }).click();
    const dialog = this.page.getByRole('dialog', { name: /cancelar título/i });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByLabel(/motivo do cancelamento/i).fill(motivo);
    await dialog.getByRole('button', { name: /confirmar cancelamento/i }).click();
    await this.autorizarComSegundaSenha(motivo);
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
  }

  /** Navega pra /financeiro/contas-receber e abre o ContaReceberFormModal já preenchido. */
  async editar(): Promise<void> {
    await this.page.getByRole('button', { name: /^editar$/i }).click();
    await expect(this.page).toHaveURL(/\/financeiro\/contas-receber/, { timeout: 10_000 });
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  }
}
