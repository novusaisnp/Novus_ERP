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
import { AutorizacaoRequeridaError } from './autorizacaoFinanceiraService';

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;
const from = supabase.from as unknown as ReturnType<typeof vi.fn>;

describe('movimentacoesService.getRateiosTitulo', () => {
  beforeEach(() => from.mockReset());

  const mockTabela = () => {
    const eq = vi.fn().mockResolvedValue({ data: [{ id: 'rateio-1' }], error: null });
    from.mockReturnValue({ select: () => ({ eq }) });
    return eq;
  };

  it('busca rateios de contas a pagar na tabela de pagar', async () => {
    const eq = mockTabela();

    const rateios = await movimentacoesService.getRateiosTitulo('titulo-1', 'CONTAS_PAGAR');

    expect(from).toHaveBeenCalledWith('rateios_contas_pagar');
    expect(eq).toHaveBeenCalledWith('conta_pagar_id', 'titulo-1');
    expect(rateios).toHaveLength(1);
  });

  it('busca rateios de contas a receber em vez de devolver lista vazia', async () => {
    const eq = mockTabela();

    const rateios = await movimentacoesService.getRateiosTitulo('titulo-1', 'CONTAS_RECEBER');

    expect(from).toHaveBeenCalledWith('rateios_contas_receber');
    expect(eq).toHaveBeenCalledWith('conta_receber_id', 'titulo-1');
    expect(rateios).toHaveLength(1);
  });

  it('propaga falha da consulta em vez de virar lista vazia', async () => {
    from.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'falha' } }) }),
    });

    await expect(
      movimentacoesService.getRateiosTitulo('titulo-1', 'CONTAS_RECEBER'),
    ).rejects.toThrow();
  });
});

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
      p_ticket_autorizacao: null,
      p_juros: 0,
      p_multa: 0,
      p_desconto: 0,
    });
  });

  it('repassa juros, multa e desconto quando informados', async () => {
    rpc.mockResolvedValue({ data: { valor_efetivo: 115 }, error: null });

    await movimentacoesService.liquidarTitulo({
      titulo_id: 'titulo-1',
      tipo_titulo: 'CONTAS_RECEBER',
      idempotency_key: 'chave-enc',
      valor_pago: 100,
      data_pagamento: '2026-08-11',
      forma_pagamento: 'PIX',
      juros: 10,
      multa: 5,
      desconto: 0,
    });

    expect(rpc).toHaveBeenCalledWith(
      'financeiro_liquidar_titulo',
      expect.objectContaining({ p_valor: 100, p_juros: 10, p_multa: 5, p_desconto: 0 }),
    );
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
      p_ticket_autorizacao: null,
    });
  });

  it('cancela o titulo somente pela RPC idempotente', async () => {
    rpc.mockResolvedValue({ data: { status: 'CANCELADO' }, error: null });

    await movimentacoesService.cancelarTitulo({
      titulo_id: 'titulo-1',
      tipo_titulo: 'CONTAS_RECEBER',
      motivo_cancelamento: 'Lançamento indevido',
      idempotency_key: 'chave-cancelamento-1',
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('financeiro_cancelar_titulo', {
      p_titulo_id: 'titulo-1',
      p_tipo_titulo: 'CONTAS_RECEBER',
      p_motivo: 'Lançamento indevido',
      p_idempotency_key: 'chave-cancelamento-1',
      p_ticket_autorizacao: null,
    });
  });

  it('repassa o ticket de autorizacao quando ele existe', async () => {
    rpc.mockResolvedValue({ data: { status: 'CANCELADO' }, error: null });

    await movimentacoesService.cancelarTitulo({
      titulo_id: 'titulo-1',
      tipo_titulo: 'CONTAS_RECEBER',
      motivo_cancelamento: 'Lançamento indevido',
      idempotency_key: 'chave-cancelamento-2',
      ticket_autorizacao: 'ticket-1',
    });

    expect(rpc).toHaveBeenCalledWith(
      'financeiro_cancelar_titulo',
      expect.objectContaining({ p_ticket_autorizacao: 'ticket-1' }),
    );
  });

  it('converte a recusa 28000 do banco em pedido de autorizacao', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '28000', message: 'Operacao exige autorizacao' },
    });

    await expect(
      movimentacoesService.cancelarTitulo({
        titulo_id: 'titulo-1',
        tipo_titulo: 'CONTAS_RECEBER',
        motivo_cancelamento: 'Lançamento indevido',
        idempotency_key: 'chave-cancelamento-3',
      }),
    ).rejects.toBeInstanceOf(AutorizacaoRequeridaError);
  });
});
