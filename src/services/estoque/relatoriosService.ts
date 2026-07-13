// P14.1: Serviço de relatórios de estoque (Kardex)
import { supabase } from '@/integrations/supabase/client';

export interface KardexParams {
  empresaId: string;
  produtoId: string;
  localizacaoId?: string | null;
  dataInicio?: string | null; // YYYY-MM-DD
  dataFim?: string | null;    // YYYY-MM-DD
  limit?: number;
  offset?: number;
}

export interface KardexRow {
  id: string;
  data_movimento: string;
  tipo: string;
  documento_ref: string | null;
  qtd_entrada: number;
  qtd_saida: number;
  saldo_acumulado: number;
  custo_unitario: number;
  custo_total: number;
  localizacao_origem_id: string | null;
  localizacao_destino_id: string | null;
  observacoes: string | null;
  total_count: number;
}

export interface KardexResult {
  rows: KardexRow[];
  total: number;
}

export async function fetchKardex(params: KardexParams): Promise<KardexResult> {
  const {
    empresaId,
    produtoId,
    localizacaoId = null,
    dataInicio = null,
    dataFim = null,
    limit = 100,
    offset = 0,
  } = params;

  const { data, error } = await supabase.rpc('fn_kardex_produto', {
    p_empresa_id: empresaId,
    p_produto_id: produtoId,
    p_localizacao_id: localizacaoId,
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as KardexRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  return { rows, total };
}

export function kardexToCsv(rows: KardexRow[]): string {
  const header = [
    'data', 'tipo', 'documento', 'qtd_entrada', 'qtd_saida',
    'saldo_acumulado', 'custo_unitario', 'custo_total', 'observacoes',
  ];
  const lines = rows.map((r) => [
    new Date(r.data_movimento).toISOString(),
    r.tipo,
    (r.documento_ref ?? '').replace(/[";\n]/g, ' '),
    Number(r.qtd_entrada).toFixed(4),
    Number(r.qtd_saida).toFixed(4),
    Number(r.saldo_acumulado).toFixed(4),
    Number(r.custo_unitario).toFixed(4),
    Number(r.custo_total).toFixed(4),
    (r.observacoes ?? '').replace(/[";\n]/g, ' '),
  ].join(';'));
  return [header.join(';'), ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
