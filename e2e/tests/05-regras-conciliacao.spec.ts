import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { STORAGE_STATE_PATH } from '../fixtures/auth.fixture';
import { dbReset } from '../fixtures/db-reset';
import { readRegraByNome, readRegraByNomeIncludingDeleted } from '../fixtures/db-read';
import { makeRegraConciliacao } from '../fixtures/test-data';
import { RegrasConciliacaoPage } from '../pages/RegrasConciliacaoPage';
import { RegraFormPage } from '../pages/RegraFormPage';

const HAS_STATE = fs.existsSync(STORAGE_STATE_PATH);

test.describe('F5 - CRUD Regras de Conciliação', () => {
  test.skip(!HAS_STATE, 'storageState ausente — rode 01-login.spec.ts primeiro.');

  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeEach(async () => {
    const res = await dbReset({ tenantName: 'E2E TEST CO' });
    expect(res.ok, res.message ?? 'dbReset falhou').toBe(true);
  });

  test('cria, edita e exclui regra de conciliação', async ({ page }) => {
    const regra = makeRegraConciliacao({ padrao: 'ALUGUEL' });
    const nome = regra.nome;

    const listPage = new RegrasConciliacaoPage(page);
    const form = new RegraFormPage(page);

    // 1) Navegar até listagem
    await listPage.goto();

    // 2) Criar nova regra: PALAVRA_CHAVE contendo "ALUGUEL"
    await listPage.openNova();
    await form.esperarAberto();
    await form.setNome(nome);
    await form.setTipo(regra.tipo);
    await form.setPadrao(regra.padrao);
    await form.salvar();

    // 3) UI: regra aparece na listagem
    await listPage.esperarLinha(nome);

    // 3b) DB: regra persistida com padrão correto
    const criada = await readRegraByNome(page, nome);
    expect(criada, 'regra não persistida no DB').toBeTruthy();
    expect(criada!.padrao).toBe('ALUGUEL');
    expect(criada!.tipo).toBe('PALAVRA_CHAVE');
    expect(criada!.ativa).toBe(true);

    // 4) Editar padrão da regra
    await listPage.editar(nome);
    await form.esperarAberto();
    await form.setPadrao('ALUGUEL COMERCIAL');
    await form.salvar();

    // 4b) UI: linha ainda presente com mesmo nome
    await listPage.esperarLinha(nome);

    // 4c) DB: padrão atualizado
    const editada = await readRegraByNome(page, nome);
    expect(editada, 'regra sumiu após edição').toBeTruthy();
    expect(editada!.id).toBe(criada!.id);
    expect(editada!.padrao).toBe('ALUGUEL COMERCIAL');

    // 5) Excluir regra
    await listPage.excluir(nome);

    // 5b) UI: linha desaparece
    await listPage.esperarSemLinha(nome);

    // 5c) DB: regra não deve estar ativa (hard delete ou soft delete)
    const ativa = await readRegraByNome(page, nome);
    expect(ativa, 'regra ainda ativa após exclusão').toBeNull();
    const todas = await readRegraByNomeIncludingDeleted(page, nome);
    // aceita hard delete (0 linhas) OU soft delete (deleted_at preenchido)
    if (todas.length > 0) {
      expect(todas.every((r) => r.deleted_at !== null)).toBe(true);
    }
  });
});
