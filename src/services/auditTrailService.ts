import { supabase } from '@/integrations/supabase/client';

export interface AuditEntry {
  id: string;
  operacao: string;
  dados_antigos: unknown;
  dados_novos: unknown;
  created_at: string;
  origem: string;
  usuario_id: string;
}

// A RPC genérica get_audit_trail(p_tabela_nome, p_registro_id) não existe mais no
// banco — a única get_audit_trail hoje é específica de movimentações bancárias
// (p_movimentacao_id).
export const auditTrailService = {
  async fetchAuditTrail(_tableName: string, movimentacaoId: string): Promise<AuditEntry[]> {
    const { data, error } = await supabase.rpc('get_audit_trail', {
      p_movimentacao_id: movimentacaoId,
    });
    if (error) {
      console.error('[auditTrailService] Erro ao buscar auditoria:', error);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      operacao: row.acao,
      dados_antigos: row.dados_anteriores,
      dados_novos: row.dados_novos,
      created_at: row.created_at,
      origem: 'movimentacoes_bancarias',
      usuario_id: row.usuario_id ?? '',
    }));
  },
};
