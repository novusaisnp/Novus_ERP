import { describe, expect, it, vi } from 'vitest';
const { chain } = vi.hoisted(() => {
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
  return { chain };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => chain, rpc: vi.fn() } }));
vi.mock('@/lib/empresaAtiva', () => ({ getEmpresaAtivaIdOuFalha: async () => 'empresa' }));
import { ordemFabricacaoService } from './ordemFabricacaoService';

// Achado A05 (AUDITORIA_PRONTIDAO_MERCADO_2026-09-13.md): list() não filtrava
// explicitamente por empresa_representada_id, contando só com RLS (que permite todas as
// empresas vinculadas ao usuário, não só a ativa) — um usuário em 2+ empresas via
// mistura de ordens de fabricação de empresas diferentes na mesma tela.
describe('ordemFabricacaoService.list', () => {
  it('filtra explicitamente pela empresa ativa', async () => {
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: [], error: null });
    await ordemFabricacaoService.list();
    expect(chain.eq).toHaveBeenCalledWith('empresa_representada_id', 'empresa');
  });
});
