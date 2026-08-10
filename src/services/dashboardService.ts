import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

export const dashboardService = {
  async fetchClientesAtivos(): Promise<number> {
    try {
      const empresaId = await getEmpresaAtivaId();
      if (!empresaId) return 0;
      const { count, error } = await supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_representada_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null);
      if (error) throw error;
      return count || 0;
    } catch {
      return 0;
    }
  },

  async fetchSumContas(table: 'contas_pagar' | 'contas_receber'): Promise<number> {
    try {
      const empresaId = await getEmpresaAtivaId();
      if (!empresaId) return 0;
      const { data, error } = await supabase
        .from(table)
        .select('valor_original')
        .eq('empresa_representada_id', empresaId)
        .eq('status', 'PENDENTE');
      if (error) throw error;
      return (data ?? []).reduce((acc, r) => acc + Number(r.valor_original || 0), 0);
    } catch {
      return 0;
    }
  },

  async fetchSaldoBancario(): Promise<number> {
    try {
      const empresaId = await getEmpresaAtivaId();
      if (!empresaId) return 0;
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('saldo_atual')
        .eq('empresa_representada_id', empresaId)
        .eq('ativo', true);
      if (error) throw error;
      return (data ?? []).reduce((acc, r) => acc + Number(r.saldo_atual || 0), 0);
    } catch {
      return 0;
    }
  },
};
