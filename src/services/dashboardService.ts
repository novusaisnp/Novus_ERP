import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

/**
 * Indicadores do dashboard.
 *
 * Nenhuma função aqui engole falha. Antes, cada uma terminava em `catch { return 0 }` e a
 * empresa não resolvida também virava zero — então uma consulta que falhava por rede, RLS ou
 * erro de query era apresentada ao usuário como "Saldo Bancário R$ 0,00", indistinguível de
 * uma empresa que realmente não tem saldo. Zero é uma resposta sobre dinheiro: só pode ser
 * exibido quando for verdade.
 */
export const dashboardService = {
  async fetchClientesAtivos(): Promise<number> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { count, error } = await supabase
      .from('entidades')
      .select('id, entidade_papeis!inner(papel)', { count: 'exact', head: true })
      .eq('empresa_representada_id', empresaId)
      .eq('entidade_papeis.papel', 'CLIENTE')
      .eq('ativo', true)
      .is('deleted_at', null);
    if (error) throw error;
    return count || 0;
  },

  async fetchSumContas(table: 'contas_pagar' | 'contas_receber'): Promise<number> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from(table)
      .select('valor_original')
      .eq('empresa_representada_id', empresaId)
      .eq('status', 'PENDENTE');
    if (error) throw error;
    return (data ?? []).reduce((acc, r) => acc + Number(r.valor_original || 0), 0);
  },

  async fetchSaldoBancario(): Promise<number> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('saldo_atual')
      .eq('empresa_representada_id', empresaId)
      .eq('ativo', true);
    if (error) throw error;
    return (data ?? []).reduce((acc, r) => acc + Number(r.saldo_atual || 0), 0);
  },
};
