import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { fetchPermissoesFinanceiras } from './permissoesFinanceirasService';

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

describe('fetchPermissoesFinanceiras', () => {
  beforeEach(() => rpc.mockReset());

  it('usa a RPC do banco e reflete o que ela retorna', async () => {
    rpc.mockResolvedValue({
      data: {
        pode_liquidar: true,
        pode_estornar: false,
        pode_editar: true,
        pode_cancelar: false,
        pode_visualizar_historico: true,
        pode_editar_rateio: true,
      },
      error: null,
    });

    const permissoes = await fetchPermissoesFinanceiras();

    expect(rpc).toHaveBeenCalledWith('financeiro_permissoes');
    expect(permissoes.pode_liquidar).toBe(true);
    expect(permissoes.pode_estornar).toBe(false);
    expect(permissoes.pode_cancelar).toBe(false);
  });

  it('nega o que a RPC nao afirmar explicitamente', async () => {
    rpc.mockResolvedValue({ data: { pode_liquidar: 'sim', pode_editar: 1 }, error: null });

    const permissoes = await fetchPermissoesFinanceiras();

    expect(Object.values(permissoes).every((v) => v === false)).toBe(true);
  });

  it('propaga o erro em vez de devolver permissao vazia silenciosa', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'falha de rede' } });

    await expect(fetchPermissoesFinanceiras()).rejects.toBeTruthy();
  });
});
