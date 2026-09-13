import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

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
  forma_emissao: string | null;
}

export interface AlertaAtivo {
  id: string;
  kind: string;
  severity: string;
  reason: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface VendaEmitivel {
  id: string;
  numero_venda: string | number | null;
  cliente_id: string | null;
  valor_total: number | null;
  data_venda: string | null;
  status: string | null;
}

export interface DocFiscalRow {
  id: string;
  numero: number | null;
  serie: number | null;
  status: string;
  data_emissao: string | null;
  valor_total: number | null;
  chave_acesso: string | null;
  provider: string | null;
  venda_id: string | null;
  forma_emissao: string | null;
}

const STATUS_EMISSAO_FISCAL = ['CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE'];

export const fiscalDashboardService = {
  async listVendasEmitiveis(): Promise<VendaEmitivel[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('vendas')
      .select('id, numero_venda, cliente_id, valor_total, data_venda, status')
      .in('status', STATUS_EMISSAO_FISCAL)
      .not('cliente_id', 'is', null)
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('data_venda', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  async listDocumentosFiscais(filtroStatus?: string): Promise<DocFiscalRow[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    let q = supabase
      .from('fiscal_documentos_eletronicos')
      .select('id, numero, serie, status, data_emissao, valor_total, chave_acesso, provider, venda_id, forma_emissao')
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);
    if (filtroStatus && filtroStatus !== 'todos') q = q.eq('status', filtroStatus);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },


  async getMetricasDiarias(): Promise<MetricRow[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('fiscal_metrics_daily')
      .select('dia, provider, status, total, valor_total, latencia_media_s')
      .gte('dia', desde)
      .eq('empresa_representada_id', empresaId)
      .order('dia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listDocumentosEmProcessamento(): Promise<DocEmProc[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const limite = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('fiscal_documentos_eletronicos')
      .select('id, numero, serie, status, data_emissao, provider, venda_id, forma_emissao')
      .in('status', ['processando', 'EM_PROCESSAMENTO'])
      .lt('created_at', limite)
      .eq('empresa_representada_id', empresaId)
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
