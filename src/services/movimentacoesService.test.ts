import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { movimentacoesService } from './movimentacoesService';

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

describe('movimentacoesService.liquidarTitulo', () => {
  beforeEach(() => rpc.mockReset());

  it('usa somente a RPC atomica e preserva a chave de idempotencia', async () => {
    rpc.mockResolvedValue({ data: { status: 'PAGO' }, error: null });

    await movimentacoesService.liquidarTitulo({
      titulo_id: 'titulo-1',
      tipo_titulo: 'CONTAS_PAGAR',
      idempotency_key: 'chave-1',
      valor_pago: 125,
      data_pagamento: '2026-08-11',
      forma_pagamento: 'PIX',
      conta_bancaria_id: 'conta-1',
      observacoes: 'Baixa de teste',
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('financeiro_liquidar_titulo', {
      p_titulo_id: 'titulo-1',
      p_tipo_titulo: 'CONTAS_PAGAR',
      p_valor: 125,
      p_data_pagamento: '2026-08-11',
      p_forma_pagamento: 'PIX',
      p_idempotency_key: 'chave-1',
      p_conta_bancaria_id: 'conta-1',
      p_observacoes: 'Baixa de teste',
      p_multi_baixa: [],
    });
  });

  it('estorna uma liquidacao especifica pela RPC idempotente', async () => {
    rpc.mockResolvedValue({ data: { idempotente: false }, error: null });

    await movimentacoesService.estornarLiquidacao({
      liquidacao_id: 'liquidacao-1',
      motivo: 'Pagamento duplicado',
      idempotency_key: 'chave-estorno-1',
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('financeiro_estornar_liquidacao', {
      p_liquidacao_id: 'liquidacao-1',
      p_motivo: 'Pagamento duplicado',
      p_idempotency_key: 'chave-estorno-1',
    });
  });
});
