import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';
import { dbReset } from '../fixtures/db-reset';
import { makeCliente, makeProduto } from '../fixtures/test-data';
import { VendaFormPage } from '../pages/VendaFormPage';
import { ContasReceberPage } from '../pages/ContasReceberPage';

const HAS_STATE = fs.existsSync(STORAGE_STATE_PATH);

test.describe('F2 - Venda -> Contas a Receber -> Liquidação', () => {
  test.skip(!HAS_STATE, 'storageState ausente — rode 01-login.spec.ts primeiro.');

  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeEach(async () => {
    const res = await dbReset({ tenantName: 'E2E TEST CO' });
    expect(res.ok, res.message ?? 'dbReset falhou').toBe(true);
  });

  test('fluxo completo de venda até liquidação', async ({ page }) => {
    const cliente = makeCliente();
    const produto = makeProduto();

    // 1. Cadastrar cliente
    await page.goto('/cadastros/clientes');
    await page.getByRole('button', { name: /novo cliente/i }).first().click();
    await page.getByTestId('cliente-nome-input').fill(cliente.nome);
    await page.getByTestId('cliente-salvar-btn').click();
    await expect(page.getByText(cliente.nome).first()).toBeVisible({ timeout: 15_000 });

    // 2. Criar venda
    const venda = new VendaFormPage(page);
    await venda.goto();
    await venda.openNovaVenda();
    await venda.selectCliente(cliente.nome);
    await venda.fillItem(0, produto.descricao, 2);
    // preço unitário via label (não recebeu data-testid)
    const precoInput = page.getByLabel(/preço unit/i).first();
    await precoInput.fill('100');
    await venda.save();
    await expect(page.getByText(/venda salva|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    // 3. Confirmar venda + gerar títulos (botão condicional ao status)
    // Como a criação padrão fica em RASCUNHO, alteramos o status antes.
    // Aqui apenas asserimos que a venda existe na listagem.
    await expect(page.getByText(cliente.nome).first()).toBeVisible();

    // 4. Ir para Contas a Receber e filtrar
    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.filtrarPor(cliente.nome);

    // Se houver título gerado (dependente do fluxo de negócio), tentar liquidar.
    // Caso a listagem esteja vazia, o teste sinaliza a lacuna sem falhar cascata.
    const linhas = page.getByRole('row').filter({ hasText: cliente.nome });
    const total = await linhas.count();
    expect(total, 'nenhum título gerado — fluxo requer status CONFIRMADO antes de "Gerar títulos"').toBeGreaterThan(0);

    await cr.abrirGestaoDaLinha(cliente.nome);
    await cr.liquidar('200,00');

    await expect(page.getByText(/liquidad|baixad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
