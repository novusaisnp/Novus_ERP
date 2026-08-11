import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

vi.mock('@/lib/empresaAtiva', () => ({
  getEmpresaAtivaIdOuFalha: () => Promise.resolve('empresa-1'),
}));

import { createContaReceber, updateContaReceber } from './contasReceberOperations';

// `select(...).eq(...).single()` da releitura da conta após salvar.
const mockReleitura = () =>
  from.mockReturnValue({
    select: () => ({
      eq: () => ({ single: () => Promise.resolve({ data: { id: 'conta-1' }, error: null }) }),
    }),
  });

const input = {
  descricao: 'Mensalidade',
  valor_original: 100,
  data_vencimento: '2026-09-01',
  rateios: [
    { plano_conta_id: 'pc-1', centro_custo_id: null, valor: 60, percentual: 60 },
    { plano_conta_id: 'pc-2', centro_custo_id: null, valor: 40, percentual: 40 },
  ],
} as never;

describe('contasReceberOperations', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    rpc.mockResolvedValue({ data: 'conta-1', error: null });
    mockReleitura();
  });

  it('cria titulo e rateios numa unica chamada transacional', async () => {
    await createContaReceber(input);

    expect(rpc).toHaveBeenCalledOnce();
    const [nome, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(nome).toBe('financeiro_salvar_titulo');
    expect(args.p_tipo_titulo).toBe('CONTAS_RECEBER');
    expect(args.p_rateios).toHaveLength(2);
    expect(args.p_empresa_id).toBe('empresa-1');
    // Sem id: a RPC entende como criação.
    expect(args.p_titulo_id).toBeUndefined();
  });

  it('edita pela mesma RPC, sem apagar rateios por fora', async () => {
    await updateContaReceber('conta-1', input);

    expect(rpc).toHaveBeenCalledOnce();
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_titulo_id).toBe('conta-1');
    // A releitura é a única outra ida ao banco; nada de delete/insert de rateio solto.
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('contas_receber');
  });

  it('propaga a falha da RPC em vez de seguir com titulo pela metade', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rateio invalido' } });

    await expect(createContaReceber(input)).rejects.toThrow('rateio invalido');
    expect(from).not.toHaveBeenCalled();
  });
});
