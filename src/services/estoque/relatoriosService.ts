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

// =====================================================================
// P14.2: Relatórios Analíticos
// =====================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (t: string) => (supabase as any).from(t);

export interface GiroRow {
  produto_id: string;
  codigo: string | null;
  nome: string;
  categoria_id: string | null;
  qtd_saida: number;
  saldo_inicial: number;
  saldo_final: number;
  estoque_medio: number;
  giro: number | null;
}

export async function fetchGiro(params: {
  empresaId: string;
  dataInicio: string;
  dataFim: string;
  categoriaId?: string | null;
  localizacaoId?: string | null;
}): Promise<GiroRow[]> {
  const { data, error } = await rpc('fn_relatorio_giro', {
    p_empresa_id: params.empresaId,
    p_data_inicio: params.dataInicio,
    p_data_fim: params.dataFim,
    p_categoria_id: params.categoriaId ?? null,
    p_localizacao_id: params.localizacaoId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as GiroRow[];
}

export interface CurvaAbcRow {
  produto_id: string;
  codigo: string | null;
  nome: string;
  categoria_id: string | null;
  qtd_saida: number;
  valor_saida: number;
  percentual_acumulado: number;
  classe: 'A' | 'B' | 'C';
  refreshed_at: string;
  total_count: number;
}

export async function fetchCurvaAbc(params: {
  empresaId: string;
  categoriaId?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ rows: CurvaAbcRow[]; total: number; refreshedAt: string | null }> {
  const { data, error } = await rpc('fn_curva_abc', {
    p_empresa_id: params.empresaId,
    p_categoria_id: params.categoriaId ?? null,
    p_limit: params.limit ?? 200,
    p_offset: params.offset ?? 0,
  });
  if (error) throw error;
  const rows = (data ?? []) as CurvaAbcRow[];
  return {
    rows,
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    refreshedAt: rows.length > 0 ? rows[0].refreshed_at : null,
  };
}

export interface PosicaoRow {
  empresa_id: string;
  produto_id: string;
  produto_codigo: string | null;
  produto_nome: string;
  categoria_id: string | null;
  localizacao_id: string;
  localizacao_nome: string;
  quantidade: number;
  custo_medio: number;
  valor_total: number;
}

export async function fetchPosicao(params: {
  empresaId: string;
  categoriaId?: string | null;
  localizacaoId?: string | null;
}): Promise<PosicaoRow[]> {
  let q = from('vw_estoque_posicao_localizacao').select('*').eq('empresa_id', params.empresaId);
  if (params.categoriaId) q = q.eq('categoria_id', params.categoriaId);
  if (params.localizacaoId) q = q.eq('localizacao_id', params.localizacaoId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PosicaoRow[];
}

export interface ParadosRow {
  produto_id: string;
  codigo: string | null;
  nome: string;
  categoria_id: string | null;
  saldo_total: number;
  custo_medio: number;
  valor_imobilizado: number;
  ultima_saida: string | null;
  dias_parado: number;
}

export async function fetchParados(params: { empresaId: string; dias: number }): Promise<ParadosRow[]> {
  const { data, error } = await rpc('fn_produtos_parados', {
    p_empresa_id: params.empresaId,
    p_dias: params.dias,
  });
  if (error) throw error;
  return (data ?? []) as ParadosRow[];
}

export interface RupturaRow {
  empresa_id: string;
  produto_id: string;
  produto_codigo: string | null;
  produto_nome: string;
  categoria_id: string | null;
  saldo_total: number;
  estoque_minimo: number;
  status: 'RUPTURA' | 'ABAIXO_MINIMO' | 'OK';
}

export async function fetchRuptura(params: {
  empresaId: string;
  categoriaId?: string | null;
}): Promise<RupturaRow[]> {
  let q = from('vw_estoque_ruptura').select('*').eq('empresa_id', params.empresaId);
  if (params.categoriaId) q = q.eq('categoria_id', params.categoriaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RupturaRow[];
}

// CSV genérico
export function rowsToCsv<T extends Record<string, unknown>>(rows: T[], columns: Array<keyof T>): string {
  const header = columns.map((c) => String(c)).join(';');
  const lines = rows.map((r) =>
    columns.map((c) => {
      const v = r[c];
      if (v === null || v === undefined) return '';
      const s = typeof v === 'number' ? v.toString() : String(v);
      return s.replace(/[";\n]/g, ' ');
    }).join(';'),
  );
  return [header, ...lines].join('\n');
}

