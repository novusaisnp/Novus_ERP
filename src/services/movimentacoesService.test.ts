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

vi.mock('@/lib/empresaAtiva', () => ({
  getEmpresaAtivaIdOuFalha: () => Promise.resolve('empresa-1'),
}));

describe('movimentacoesService.salvarRateios', () => {
  beforeEach(() => rpc.mockReset());

  it('troca somente os rateios, com payload de titulo vazio', async () => {
    rpc.mockResolvedValue({ data: 'titulo-1', error: null });

    await movimentacoesService.salvarRateios('titulo-1', 'CONTAS_RECEBER', [
      { plano_conta_id: 'pc-1', valor: 60, percentual: 60, descricao: 'parte A' },
      { plano_conta_id: 'pc-2', valor: 40, percentual: 40 },
    ]);

    expect(rpc).toHaveBeenCalledOnce();
    const [nome, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(nome).toBe('financeiro_salvar_titulo');
    // Payload vazio: a RPC não monta UPDATE nenhum, então o título fica intacto.
    expect(args.p_dados).toEqual({});
    expect(args.p_titulo_id).toBe('titulo-1');
    expect(args.p_rateios).toHaveLength(2);
    // `descricao` na interface é `observacoes` na tabela.
    expect((args.p_rateios as Array<Record<string, unknown>>)[0].observacoes).toBe('parte A');
  });

  it('lista vazia remove o rateio do titulo', async () => {
    rpc.mockResolvedValue({ data: 'titulo-1', error: null });

    await movimentacoesService.salvarRateios('titulo-1', 'CONTAS_PAGAR', []);

    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_rateios).toEqual([]);
  });

  it('propaga falha em vez de fingir sucesso', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rubrica invalida' } });

    await expect(
      movimentacoesService.salvarRateios('titulo-1', 'CONTAS_RECEBER', []),
    ).rejects.toThrow('rubrica invalida');
  });
});

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
      p_data_contabil: null,
    });
  });

  it('estorna com data contabil explicita quando informada', async () => {
    rpc.mockResolvedValue({ data: { status: 'PENDENTE' }, error: null });

    await movimentacoesService.estornarLiquidacao({
      liquidacao_id: 'liquidacao-1',
      motivo: 'Pagamento duplicado',
      idempotency_key: 'chave-estorno-1',
      data_contabil: '2026-09-01',
    });

    expect(rpc).toHaveBeenCalledWith('financeiro_estornar_liquidacao', {
      p_liquidacao_id: 'liquidacao-1',
      p_motivo: 'Pagamento duplicado',
      p_idempotency_key: 'chave-estorno-1',
      p_ticket_autorizacao: null,
      p_data_contabil: '2026-09-01',
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
