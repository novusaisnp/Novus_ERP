import { supabase } from "@/integrations/supabase/client";

export type OrcamentoStatus =
  | 'rascunho'
  | 'enviado'
  | 'aprovado'
  | 'recusado'
  | 'expirado'
  | 'cancelado'
  | 'convertido';

export type TipoOrcamento = 'P' | 'S' | 'H';
export type TipoItem = 'P' | 'S';

export interface OrcamentoItem {
  id?: string;
  orcamentoId?: string;
  tipoItem: TipoItem;
  produtoId?: string | null;
  servicoId?: string | null;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
  desconto?: number;
  valorTotal?: number;
  ordem?: number;
  observacoes?: string | null;
}

export interface Orcamento {
  id: string;
  empresaRepresentadaId: string;
  numero: string;
  tipo: TipoOrcamento;
  clienteId: string | null;
  clienteNome?: string | null;
  dataEmissao: string;
  dataValidade: string | null;
  valorTotal: number;
  status: OrcamentoStatus;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  itens?: OrcamentoItem[];
}

export interface OrcamentoInput {
  empresaRepresentadaId: string;
  numero: string;
  tipo: TipoOrcamento;
  clienteId?: string | null;
  dataEmissao?: string;
  dataValidade?: string | null;
  valorTotal?: number;
  status?: OrcamentoStatus;
  observacoes?: string | null;
  itens?: OrcamentoItem[];
}

type ItemRow = {
  id: string;
  orcamento_id: string;
  tipo_item: TipoItem;
  produto_id: string | null;
  servico_id: string | null;
  descricao: string;
  quantidade: number | string;
  preco_unitario: number | string;
  desconto: number | string;
  valor_total: number | string;
  ordem: number;
  observacoes: string | null;
};

type Row = {
  id: string;
  empresa_representada_id: string;
  numero: string;
  tipo: TipoOrcamento;
  cliente_id: string | null;
  data_emissao: string;
  data_validade: string | null;
  valor_total: number | string;
  status: OrcamentoStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string } | null;
  orcamentos_venda_itens?: ItemRow[] | null;
};

const mapItem = (r: ItemRow): OrcamentoItem => ({
  id: r.id,
  orcamentoId: r.orcamento_id,
  tipoItem: r.tipo_item,
  produtoId: r.produto_id,
  servicoId: r.servico_id,
  descricao: r.descricao,
  quantidade: Number(r.quantidade) || 0,
  precoUnitario: Number(r.preco_unitario) || 0,
  desconto: Number(r.desconto) || 0,
  valorTotal: Number(r.valor_total) || 0,
  ordem: r.ordem,
  observacoes: r.observacoes,
});

const mapRow = (r: Row): Orcamento => ({
  id: r.id,
  empresaRepresentadaId: r.empresa_representada_id,
  numero: r.numero,
  tipo: r.tipo,
  clienteId: r.cliente_id,
  clienteNome: r.clientes?.nome ?? null,
  dataEmissao: r.data_emissao,
  dataValidade: r.data_validade,
  valorTotal: Number(r.valor_total) || 0,
  status: r.status,
  observacoes: r.observacoes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  itens: (r.orcamentos_venda_itens ?? [])
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map(mapItem),
});

export const calcItemTotal = (i: OrcamentoItem): number =>
  Math.max(0, (Number(i.quantidade) || 0) * (Number(i.precoUnitario) || 0) - (Number(i.desconto) || 0));

export const calcTotal = (itens: OrcamentoItem[]): number =>
  itens.reduce((s, i) => s + calcItemTotal(i), 0);

const SELECT = '*, clientes(nome), orcamentos_venda_itens(*)';

export const fetchOrcamentos = async (): Promise<Orcamento[]> => {
  const { data, error } = await supabase
    .from('orcamentos_venda')
    .select(SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as unknown as Row));
};

export const fetchOrcamentoById = async (id: string): Promise<Orcamento | null> => {
  const { data, error } = await supabase
    .from('orcamentos_venda')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as Row) : null;
};

const insertItens = async (
  orcamentoId: string,
  empresaId: string,
  itens: OrcamentoItem[],
) => {
  if (!itens.length) return;
  const rows = itens.map((i, idx) => ({
    orcamento_id: orcamentoId,
    empresa_representada_id: empresaId,
    produto_id: i.produtoId ?? null,
    servico_id: i.servicoId ?? null,
    descricao: i.descricao,
    quantidade: i.quantidade,
    preco_unitario: i.precoUnitario,
    desconto: i.desconto ?? 0,
    valor_total: calcItemTotal(i),
    ordem: i.ordem ?? idx,
    observacoes: i.observacoes ?? null,
  }));
  const { error } = await supabase.from('orcamentos_venda_itens').insert(rows);
  if (error) throw error;
};

export const createOrcamento = async (input: OrcamentoInput): Promise<Orcamento> => {
  const { data: authUser } = await supabase.auth.getUser();
  const itens = input.itens ?? [];
  const total = itens.length ? calcTotal(itens) : (input.valorTotal ?? 0);
  const { data, error } = await supabase
    .from('orcamentos_venda')
    .insert({
      empresa_representada_id: input.empresaRepresentadaId,
      numero: input.numero,
      cliente_id: input.clienteId ?? null,
      data_emissao: input.dataEmissao ?? new Date().toISOString().slice(0, 10),
      data_validade: input.dataValidade ?? null,
      valor_total: total,
      status: input.status ?? 'rascunho',
      observacoes: input.observacoes ?? null,
      created_by: authUser.user?.id ?? null,
    })
    .select('id, empresa_representada_id')
    .single();
  if (error) throw error;
  await insertItens(data.id, data.empresa_representada_id, itens);
  const created = await fetchOrcamentoById(data.id);
  return created!;
};

export const updateOrcamento = async (
  id: string,
  input: Partial<OrcamentoInput>,
): Promise<Orcamento> => {
  const payload: {
    numero?: string;
    cliente_id?: string | null;
    data_emissao?: string;
    data_validade?: string | null;
    status?: OrcamentoStatus;
    observacoes?: string | null;
    valor_total?: number;
  } = {};
  if (input.numero !== undefined) payload.numero = input.numero;
  if (input.clienteId !== undefined) payload.cliente_id = input.clienteId ?? null;
  if (input.dataEmissao !== undefined) payload.data_emissao = input.dataEmissao;
  if (input.dataValidade !== undefined) payload.data_validade = input.dataValidade ?? null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes ?? null;

  if (input.itens !== undefined) {
    payload.valor_total = calcTotal(input.itens);
  } else if (input.valorTotal !== undefined) {
    payload.valor_total = input.valorTotal;
  }

  const { data: updated, error } = await supabase
    .from('orcamentos_venda')
    .update(payload)
    .eq('id', id)
    .select('id, empresa_representada_id')
    .single();
  if (error) throw error;

  if (input.itens !== undefined) {
    const { error: delErr } = await supabase
      .from('orcamentos_venda_itens')
      .delete()
      .eq('orcamento_id', id);
    if (delErr) throw delErr;
    await insertItens(id, updated.empresa_representada_id, input.itens);
  }

  const full = await fetchOrcamentoById(id);
  return full!;
};

export const updateOrcamentoStatus = async (
  id: string,
  status: OrcamentoStatus,
): Promise<void> => {
  const { error } = await supabase
    .from('orcamentos_venda')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

export const softDeleteOrcamento = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('orcamentos_venda')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};
