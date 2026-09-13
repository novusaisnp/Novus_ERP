import { describe, expect, it, vi } from 'vitest';
const { chain, update } = vi.hoisted(() => {
  const update = vi.fn();
  const chain = { update, eq: vi.fn(), select: vi.fn(), single: vi.fn() };
  return { chain, update };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => chain } }));
vi.mock('@/lib/empresaAtiva', () => ({ getEmpresaAtivaIdOuFalha: async () => 'empresa' }));
import { atualizarContaBancaria } from './contaBancariaService';
describe('saldo bancário calculado no servidor', () => {
  it('envia somente saldo inicial, sem ler ou escrever snapshot de saldo atual', async () => {
    update.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.select.mockReturnValue(chain);
    chain.single.mockResolvedValue({ data: { id: 'conta', saldo_inicial: 200, saldo_atual: 270 }, error: null });
    const result = await atualizarContaBancaria('conta', { saldo_inicial: 200 });
    expect(update).toHaveBeenCalledWith({ saldo_inicial: 200 });
    expect(chain.single).toHaveBeenCalledOnce();
    expect(chain.eq).toHaveBeenCalledWith('empresa_representada_id', 'empresa');
    expect(result.saldo_atual).toBe(270);
  });
});
