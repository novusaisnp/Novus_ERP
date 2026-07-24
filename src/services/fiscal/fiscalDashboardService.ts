import { supabase } from '@/integrations/supabase/client';

export interface MetricRow {
  dia: string;
  provider: string;
  status: string;
  total: number;
  valor_total: number;
  latencia_media_s: number | null;
}

export interface DocEmProc {
  id: string;
  numero: number | null;
  serie: number | null;
  status: string;
  data_emissao: string | null;
  provider: string | null;
  venda_id: string | null;
}

export interface AlertaAtivo {
  id: string;
  kind: string;
  severity: string;
  reason: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export const fiscalDashboardService = {
  async getMetricasDiarias(): Promise<MetricRow[]> {
    const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('fiscal_metrics_daily')
      .select('dia, provider, status, total, valor_total, latencia_media_s')
      .gte('dia', desde)
      .order('dia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listDocumentosEmProcessamento(): Promise<DocEmProc[]> {
    const limite = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('fiscal_documentos_eletronicos')
      .select('id, numero, serie, status, data_emissao, provider, venda_id')
      .in('status', ['processando', 'EM_PROCESSAMENTO'])
      .lt('created_at', limite)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  async listAlertasFiscaisAtivos(): Promise<AlertaAtivo[]> {
    const { data, error } = await supabase
      .from('report_ops_alerts')
      .select('id, kind, severity, reason, payload, created_at')
      .is('resolved_at', null)
      .like('kind', 'fiscal_%')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as AlertaAtivo[];
  },

  async reprocessarEmissao(vendaId: string): Promise<{ status?: string }> {
    const { data, error } = await supabase.functions.invoke('fiscal-emitir-nfe', {
      body: { vendaId },
    });
    if (error) throw error;
    return data ?? {};
  },

  async rodarSmoke(vendaId?: string): Promise<{
    ok?: boolean;
    step?: string;
    documento_id?: string;
    results?: Array<{ error?: string }>;
  }> {
    const { data, error } = await supabase.functions.invoke('fiscal-smoke-run', {
      body: vendaId ? { vendaId } : {},
    });
    if (error) throw error;
    return data ?? {};
  },
};
