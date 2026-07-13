import { test } from '@playwright/test';

// P16.3: F2 fica marcado como fixme até que os POMs de Venda/Contas a Receber
// tenham seletores estáveis confirmados no app (P16.3.b).
test.describe('F2 - Venda -> Contas a Receber -> Liquidação', () => {
  test.fixme('fluxo completo de venda até liquidação', async () => {
    // Ver e2e/README.md §F2 — implementação pendente de data-testids na UI.
  });
});
