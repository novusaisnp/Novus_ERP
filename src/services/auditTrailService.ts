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

export const auditTrailService = {
  async fetchAuditTrail(tableName: string, recordId: string): Promise<AuditEntry[]> {
    const { data, error } = await supabase.rpc('get_audit_trail', {
      p_tabela_nome: tableName,
      p_registro_id: recordId,
    });
    if (error) {
      console.error('[auditTrailService] Erro ao buscar auditoria:', error);
      return [];
    }
    return (data ?? []) as unknown as AuditEntry[];
  },
};
