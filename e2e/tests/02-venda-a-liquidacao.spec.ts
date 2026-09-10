import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';
import { dbReset } from '../fixtures/db-reset';
import { setVendaStatus } from '../fixtures/set-venda-status';
import {
  readClienteIdByNome,
  readVendaIdByCliente,
  readContasReceberByCliente,
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
    await venda.selectPlanoPagamento('À Vista');
    await venda.fillItem(0, produto.descricao, 2, 100);
    await venda.save();
    await expect(page.getByText(/venda salva|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    // 2b. Reabrir em edição pra registrar o pagamento — "Gerar títulos" lê de
    // venda_pagamento/venda_pagamento_parcelas, não dos itens da venda direto,
    // e essa seção só existe depois da venda já ter id (ver VendaFormPage.registrarPagamento).
    await venda.abrirEdicao(cliente.nome);
    await venda.registrarPagamento(200);
    await venda.fecharModal();

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

    // 5. Liquidar o título — a ação de liquidar não existe em
    // /financeiro/contas-receber (só edita/exclui o cadastro do título); vive em
    // /financeiro/movimentacoes (ver ContasReceberPage). Achado à parte: "Busca
    // Geral" em Contas a Receber (contasReceberQueries.ts) só filtra
    // numero_documento/descricao — nunca o nome do cliente, apesar do rótulo.
    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.liquidar(cliente.nome, '200,00');
    await expect(page.getByText(/liquidad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    // 6. Asserções de DB
    const contas = await readContasReceberByCliente(page, clienteId!);
    expect(contas.length, 'nenhum título gerado').toBeGreaterThan(0);
    const saldoTotal = contas.reduce(
      (acc, c) => acc + (Number(c.valor_original) - Number(c.valor_recebido ?? 0)),
      0,
    );
    expect(saldoTotal, 'saldo devedor não zerou após liquidação').toBe(0);

    const statusFinal = contas.every((c) => c.status === 'RECEBIDO');
    expect(statusFinal, 'título não marcado como RECEBIDO após liquidação').toBe(true);

    // Liquidação em dinheiro (forma de pagamento default) não gera
    // movimentação bancária por design — pagamento em espécie não passa por
    // conta bancária (ver `necessitaContaBancaria` em LiquidacaoTituloModal.tsx).
    // Testar o caminho que gera movimentacoes_bancarias exigiria seed de
    // banco + agência + conta bancária (listarContasBancariasAtivasComAgenciaBanco
    // faz INNER JOIN em agencias_bancarias, nenhuma delas existe no tenant E2E)
    // — fora do escopo deste spec; o essencial da liquidação já está provado
    // acima (status RECEBIDO + saldo devedor zerado).
  });
});
