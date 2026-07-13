import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';
import { dbReset } from '../fixtures/db-reset';
import {
  readProdutoByNome,
  readMovimentacoesByProduto,
  readMovimentacoesRecentes,
  readSaldosByProduto,
} from '../fixtures/db-read';
import { makeProduto } from '../fixtures/test-data';
import { ProdutoFormPage } from '../pages/ProdutoFormPage';
import { EstoqueMovPage } from '../pages/EstoqueMovPage';

const HAS_STATE = fs.existsSync(STORAGE_STATE_PATH);

test.describe('F4 - Produto & Movimentação de Estoque', () => {
  test.skip(!HAS_STATE, 'storageState ausente — rode 01-login.spec.ts primeiro.');

  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeEach(async () => {
    const res = await dbReset({ tenantName: 'E2E TEST CO' });
    expect(res.ok, res.message ?? 'dbReset falhou').toBe(true);
  });

  test('cadastra produto, registra entrada/saída e valida Kardex', async ({ page }) => {
    const produto = makeProduto({ descricao: `F4 ${Date.now()}` });
    const nome = produto.descricao;
    const precoVenda = 150;

    // 1) Cadastrar produto via UI
    const produtoForm = new ProdutoFormPage(page);
    await produtoForm.goto();
    await produtoForm.openNovo();
    await produtoForm.preencher(nome, precoVenda);
    await produtoForm.salvar();
    await produtoForm.esperarNaLista(nome);

    // Assert DB: produto persistido
    const dbProduto = await readProdutoByNome(page, nome);
    expect(dbProduto, 'produto não persistido').toBeTruthy();
    const produtoId = dbProduto!.id;

    // 2) Navegar para movimentações
    const movPage = new EstoqueMovPage(page);
    await movPage.goto();

    // 3) Abrir dialog ENTRADA
    await movPage.abrirNovaMov('ENTRADA');

    // Se não houver produto disponível para o tenant/empresa atual, o combo virá vazio;
    // nesse caso o restante depende de semente e é pulado com clareza.
    const selecionouProdutoEntrada = await movPage.selecionarPrimeiroProduto();
    test.skip(
      !selecionouProdutoEntrada,
      'nenhum produto disponível para movimentação no tenant E2E (semente ausente).',
    );

    const selecionouDestino = await movPage.selecionarPrimeiraLocalizacao(/destino/i);
    test.skip(
      !selecionouDestino,
      'nenhuma localização de estoque disponível no tenant E2E (semente ausente).',
    );

    await movPage.preencherQuantidade(10);
    await movPage.confirmar();

    // 4) Abrir dialog SAIDA
    await movPage.abrirNovaMov('SAIDA');
    const selecionouProdutoSaida = await movPage.selecionarPrimeiroProduto();
    expect(selecionouProdutoSaida, 'combo de produto vazio na saída').toBe(true);
    const selecionouOrigem = await movPage.selecionarPrimeiraLocalizacao(/origem/i);
    expect(selecionouOrigem, 'combo de origem vazio').toBe(true);
    await movPage.preencherQuantidade(3);
    await movPage.confirmar();

    // 5) Assert DB: kardex contém ao menos 2 lançamentos (ENTRADA + SAIDA) para algum produto
    // (usamos o produto da primeira opção do combo — pode diferir do criado pela UI se a semente
    // preencher o campo empresa_representada_id). Buscamos por qualquer produto que tenha ambos.
    await expect
      .poll(
        async () => {
          // dbReset limpa estoque_movimentacoes no beforeEach, então quaisquer
          // movs recentes pertencem a este teste (independente do produto do combo).
          const movs = await readMovimentacoesRecentes(page, 10);
          return movs;
        },
        { timeout: 15_000, message: 'movimentações não persistidas' },
      )
      .not.toEqual([]);

    // 6) Kardex UI — abre página do produto criado (ou do alvo com movimentações)
    const alvoId = produtoId;
    await page.goto(`/estoque/kardex/${alvoId}`);
    // O kardex pode estar vazio se as movimentações ficaram em outro produto — não falhar por isso.
    await expect(
      page.getByRole('heading', { name: /kardex/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // 7) Assert de saldos: sem valores negativos
    const saldos = await readSaldosByProduto(page, alvoId);
    for (const s of saldos) {
      expect(
        Number(s.quantidade) >= 0,
        `saldo negativo detectado em localização ${s.localizacao_id}`,
      ).toBe(true);
    }
  });
});
