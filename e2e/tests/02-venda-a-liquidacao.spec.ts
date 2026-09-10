import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';
import { dbReset } from '../fixtures/db-reset';
import { setVendaStatus } from '../fixtures/set-venda-status';
import {
  readClienteIdByNome,
  readVendaIdByCliente,
  readContasReceberByCliente,
  readMovimentacoesByOrigem,
} from '../fixtures/db-read';
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

  test('fluxo completo de venda até liquidação com asserções de DB', async ({ page }) => {
    const cliente = makeCliente();
    const produto = makeProduto();

    // 1. Cadastrar cliente — desde o Cadastro Unificado de Entidades (2026-08-11),
    // Clientes.tsx só lista quem já tem o papel CLIENTE e não cria mais inline; toda
    // criação passa pelo formulário único em Cadastros → Entidades (deep-link
    // ?papel=CLIENTE pré-marca o papel e abre o dialog direto).
    await page.goto('/cadastros/entidades?papel=CLIENTE');
    await page.getByLabel(/razão social/i).fill(cliente.nome);
    await page.getByLabel(/^cnpj/i).fill(cliente.cnpj_cpf);
    await page.getByRole('button', { name: /^cadastrar$/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

    // 2. Criar venda (fica em RASCUNHO por padrão)
    const venda = new VendaFormPage(page);
    await venda.goto();
    await venda.openNovaVenda();
    await venda.selectCliente(cliente.nome);
    await venda.fillItem(0, produto.descricao, 2, 100);
    await venda.save();
    await expect(page.getByText(/venda salva|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    // 3. Recuperar IDs e transicionar status para CONFIRMADO (via RPC de teste)
    const clienteId = await readClienteIdByNome(page, cliente.nome);
    expect(clienteId, 'cliente não encontrado no DB').toBeTruthy();

    const vendaId = await readVendaIdByCliente(page, clienteId!);
    expect(vendaId, 'venda não encontrada no DB').toBeTruthy();

    const setStatus = await setVendaStatus({ vendaId: vendaId!, status: 'CONFIRMADO' });
    expect(setStatus.ok, setStatus.message ?? 'setVendaStatus falhou').toBe(true);

    // 4. Voltar à lista de vendas e gerar títulos
    await venda.goto();
    await page.reload();
    await page.getByTestId('venda-gerar-titulos-btn').first().click();
    await expect(page.getByText(/título|gerad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    // 5. Ir para Contas a Receber e liquidar
    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.filtrarPor(cliente.nome);

    const linhas = page.getByRole('row').filter({ hasText: cliente.nome });
    await expect(linhas.first()).toBeVisible({ timeout: 15_000 });

    await cr.abrirGestaoDaLinha(cliente.nome);
    await cr.liquidar('200,00');
    await expect(page.getByText(/liquidad|baixad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    // 6. Asserções de DB
    const contas = await readContasReceberByCliente(page, clienteId!);
    expect(contas.length, 'nenhum título gerado').toBeGreaterThan(0);
    const saldoTotal = contas.reduce((acc, c) => acc + Number(c.saldo_devedor ?? 0), 0);
    expect(saldoTotal, 'saldo devedor não zerou após liquidação').toBe(0);

    // Movimentações bancárias vinculadas a algum título liquidado
    let movimentacoesConciliadas = 0;
    for (const c of contas) {
      const movs = await readMovimentacoesByOrigem(page, c.id);
      movimentacoesConciliadas += movs.filter((m) => m.conciliado === true).length;
    }
    expect(movimentacoesConciliadas, 'nenhuma movimentação bancária conciliada').toBeGreaterThan(0);
  });
});
