import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';
import { dbReset } from '../fixtures/db-reset';
import {
  readExtratoById,
  readLinhasExtrato,
  readFirstContaBancaria,
} from '../fixtures/db-read';
import { ConciliacaoImportPage } from '../pages/ConciliacaoImportPage';
import { ConciliacaoMatchPage } from '../pages/ConciliacaoMatchPage';

const HAS_STATE = fs.existsSync(STORAGE_STATE_PATH);
const ASSET_CSV = path.resolve(process.cwd(), 'e2e/assets/extrato-teste.csv');
const ASSET_OFX = path.resolve(process.cwd(), 'e2e/assets/extrato-teste.ofx');

test.describe('F3 - Importação + Conciliação Bancária', () => {
  test.skip(!HAS_STATE, 'storageState ausente — rode 01-login.spec.ts primeiro.');

  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeEach(async () => {
    const res = await dbReset({ tenantName: 'E2E TEST CO' });
    expect(res.ok, res.message ?? 'dbReset falhou').toBe(true);
  });

  test('importa extrato, gera linhas e apresenta ações de conciliação', async ({ page }) => {
    // Pré-condição: precisa existir ao menos uma conta bancária no tenant.
    await page.goto('/gestao-bancaria/conciliacao/importar');
    const conta = await readFirstContaBancaria(page);
    test.skip(!conta, 'nenhuma conta bancária disponível no tenant E2E — semente ausente.');

    // 1. Importar arquivo CSV
    const importPage = new ConciliacaoImportPage(page);
    await importPage.goto();
    const contaId = await importPage.selectFirstConta();
    expect(contaId).toBeTruthy();

    const assetPath = fs.existsSync(ASSET_CSV) ? ASSET_CSV : ASSET_OFX;
    expect(fs.existsSync(assetPath), 'asset de extrato ausente').toBe(true);
    await importPage.setFile(assetPath);
    await importPage.submit();

    // 2. Aguardar redirecionamento para a página de match
    const match = new ConciliacaoMatchPage(page);
    await match.waitLoaded();

    const extratoId = match.extratoIdFromUrl();
    expect(extratoId, 'extrato_id não presente na URL').toBeTruthy();

    // 3. Assert DB: extrato existe com linhas
    const extrato = await readExtratoById(page, extratoId!);
    expect(extrato, 'extrato não persistido').toBeTruthy();
    expect(['IMPORTADO', 'PROCESSADO']).toContain(extrato!.status);

    const linhas = await readLinhasExtrato(page, extratoId!);
    expect(linhas.length, 'nenhuma linha extraída').toBeGreaterThan(0);

    // 4. Assert UI: linhas renderizadas + card de ações
    const linhaId = await match.firstLinhaId();
    await match.selectLinha(linhaId);
    await expect(
      page.getByRole('heading', { name: /ações e candidatos/i }),
    ).toBeVisible({ timeout: 10_000 });

    // 5. Fluxo de conciliação: se houver candidato, confirma; caso contrário,
    //    aciona "Criar nova movimentação" que também concilia a linha.
    const candidatos = match.candidateButtons();
    if ((await candidatos.count()) > 0) {
      await match.confirmarPrimeiroCandidato();
    } else {
      await match.criarLancamentoDoExtrato();
    }

    // 6. Assert DB final: pelo menos uma linha do extrato ficou CONCILIADA
    await expect
      .poll(
        async () => {
          const rows = await readLinhasExtrato(page, extratoId!);
          return rows.filter((r) => r.status_conciliacao === 'CONCILIADO').length;
        },
        { timeout: 20_000, message: 'nenhuma linha do extrato ficou CONCILIADA' },
      )
      .toBeGreaterThan(0);
  });
});
