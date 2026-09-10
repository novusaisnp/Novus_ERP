import { test, expect, type Page } from '@playwright/test';
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

/**
 * Mesmo caminho de 02-venda-a-liquidacao.spec.ts até gerar um título ABERTO —
 * repetido aqui como setup porque cada teste deste arquivo testa uma ação
 * diferente sobre esse título (liquidar parcial, cancelar, estornar, editar).
 */
async function criarTituloAberto(
  page: Page,
): Promise<{ clienteId: string; clienteNome: string; tituloId: string }> {
  const cliente = makeCliente();
  const produto = makeProduto();

  await page.goto('/cadastros/entidades?papel=CLIENTE');
  await page.getByLabel(/razão social/i).fill(cliente.nome);
  await page.getByLabel(/^cnpj/i).fill(cliente.cnpj_cpf);
  await page.getByRole('button', { name: /^cadastrar$/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

  const venda = new VendaFormPage(page);
  await venda.goto();
  await venda.openNovaVenda();
  await venda.selectCliente(cliente.nome);
  await venda.selectPlanoPagamento('À Vista');
  await venda.fillItem(0, produto.descricao, 2, 100);
  await venda.save();
  await expect(page.getByText(/venda salva|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

  await venda.abrirEdicao(cliente.nome);
  await venda.registrarPagamento(200);
  await venda.fecharModal();

  const clienteId = await readClienteIdByNome(page, cliente.nome);
  expect(clienteId, 'cliente não encontrado no DB').toBeTruthy();

  const vendaId = await readVendaIdByCliente(page, clienteId!);
  expect(vendaId, 'venda não encontrada no DB').toBeTruthy();

  const setStatus = await setVendaStatus({ vendaId: vendaId!, status: 'CONFIRMADO' });
  expect(setStatus.ok, setStatus.message ?? 'setVendaStatus falhou').toBe(true);

  await venda.goto();
  await page.reload();
  await page.getByTestId('venda-gerar-titulos-btn').first().click();
  await expect(page.getByText(/título|gerad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

  const contas = await readContasReceberByCliente(page, clienteId!);
  expect(contas.length, 'nenhum título gerado').toBeGreaterThan(0);

  return { clienteId: clienteId!, clienteNome: cliente.nome, tituloId: contas[0].id };
}

test.describe('F6 - Ciclo de vida do título (FIN-1)', () => {
  test.skip(!HAS_STATE, 'storageState ausente — rode 01-login.spec.ts primeiro.');

  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeEach(async () => {
    const res = await dbReset({ tenantName: 'E2E TEST CO' });
    expect(res.ok, res.message ?? 'dbReset falhou').toBe(true);
  });

  test('liquidar parcial deixa saldo em aberto', async ({ page }) => {
    const { clienteId, clienteNome } = await criarTituloAberto(page);

    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.liquidar(clienteNome, '100,00'); // metade dos R$200 originais
    await expect(page.getByText(/liquidad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    const contas = await readContasReceberByCliente(page, clienteId);
    expect(contas.length).toBeGreaterThan(0);
    const saldo = Number(contas[0].valor_original) - Number(contas[0].valor_recebido ?? 0);
    expect(saldo, 'saldo devedor deveria ser R$100 após liquidação parcial').toBe(100);
    expect(contas[0].status, 'status deveria refletir liquidação parcial').not.toBe('RECEBIDO');
  });

  test('cancelar título aberto muda status e preserva pra auditoria', async ({ page }) => {
    const { clienteId, clienteNome } = await criarTituloAberto(page);

    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.abrirGestao(clienteNome);
    await cr.cancelar('Cancelamento de teste automatizado E2E');

    const contas = await readContasReceberByCliente(page, clienteId);
    expect(contas.length, 'título cancelado não deveria sumir do banco').toBeGreaterThan(0);
    expect(contas[0].status).toMatch(/CANCELAD/i);
  });

  test('estornar liquidação total reverte saldo recebido', async ({ page }) => {
    const { clienteId, clienteNome } = await criarTituloAberto(page);

    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.liquidar(clienteNome, '200,00');
    await expect(page.getByText(/liquidad|sucesso/i).first()).toBeVisible({ timeout: 15_000 });

    await cr.goto();
    await cr.abrirGestao(clienteNome);
    await cr.estornar('Estorno de teste automatizado E2E');

    const contas = await readContasReceberByCliente(page, clienteId);
    expect(Number(contas[0].valor_recebido ?? 0), 'valor recebido deveria voltar a zero após estorno').toBe(0);
  });

  test('editar título via Movimentações Financeiras persiste a mudança', async ({ page }) => {
    const { clienteId, clienteNome } = await criarTituloAberto(page);

    const cr = new ContasReceberPage(page);
    await cr.goto();
    await cr.abrirGestao(clienteNome);
    await cr.editar();

    // Título gerado a partir da venda nunca teve número de documento —
    // "Editar" pede o dado obrigatório (validação nativa do navegador barra o
    // submit até isso ser preenchido).
    await page.getByLabel(/número do documento/i).fill(`NF-E2E-${Date.now()}`);

    const observacoes = `Editado via E2E ${Date.now()}`;
    await page.getByLabel(/observações/i).fill(observacoes);
    await page.getByRole('button', { name: /^atualizar$/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

    const contas = await readContasReceberByCliente(page, clienteId);
    expect(contas.length).toBeGreaterThan(0);
    expect(contas[0].observacoes, 'edição não persistiu no banco').toBe(observacoes);
  });
});
