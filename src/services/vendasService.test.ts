import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc, from } }));
vi.mock('@/lib/empresaAtiva', () => ({ getEmpresaAtivaIdOuFalha: async () => 'empresa-ativa' }));
import { vendasService } from './vendasService';
import type { Venda } from '@/types/vendas';
const venda: Venda = { data_venda: '2026-09-13', status: 'CONFIRMADO', itens: [{ descricao: 'Produto', quantidade: 2, preco_unitario: 10 }] };
describe('venda transacional', () => {
  beforeEach(() => vi.clearAllMocks());
  it('usa a empresa ativa e os totais retornados pelo servidor, em uma única chamada', async () => {
    const persisted = { ...venda, id: 'nova', valor_total: 20 };
    rpc.mockResolvedValue({ data: persisted, error: null });
    expect(await vendasService.save({ ...venda, empresa_representada_id: 'outra', valor_total: 999 })).toEqual(persisted);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('venda_salvar_atomica', expect.objectContaining({ p_empresa_id: 'empresa-ativa', p_itens: venda.itens }));
    expect(from).not.toHaveBeenCalled();
  });
  it('propaga falha de estoque sem anunciar salvamento', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'SALDO_INSUFICIENTE' } });
    await expect(vendasService.save(venda)).rejects.toThrow('SALDO_INSUFICIENTE');
  });
  it('cancelamento propaga falha de reversão e não faz gravações separadas', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('Estorno falhou') });
    await expect(vendasService.cancelar('venda')).rejects.toThrow('Estorno falhou');
    expect(rpc).toHaveBeenCalledWith('venda_cancelar_atomica', { p_empresa_id: 'empresa-ativa', p_venda_id: 'venda' });
    expect(from).not.toHaveBeenCalled();
  });
});
