import { test } from '@playwright/test';

test.describe('F3 - Importação + Conciliação Bancária', () => {
  test.fixme('upload de extrato e match automático', async () => {
    // Pendente: seletor estável para o input de upload + edge fn banco-parse-extrato.
  });
});
