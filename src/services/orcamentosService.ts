import { supabase } from "@/integrations/supabase/client";

export type OrcamentoStatus =
  | 'rascunho'
  | 'enviado'
  | 'aprovado'
  | 'recusado'
  | 'expirado'
  | 'cancelado'
  | 'convertido';

export interface Orcamento {
  id: string;
  empresaRepresentadaId: string;
  numero: string;
  clienteId: string | null;
  clienteNome?: string | null;
  dataEmissao: string;
  dataValidade: string | null;
  valorTotal: number;
  status: OrcamentoStatus;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrcamentoInput {
  empresaRepresentadaId: string;
  numero: string;
  clienteId?: string | null;
  dataEmissao?: string;
  dataValidade?: string | null;
  valorTotal?: number;
  status?: OrcamentoStatus;
  observacoes?: string | null;
}

type Row = {
  id: string;
  empresa_representada_id: string;
  numero: string;
  cliente_id: string | null;
  data_emissao: string;
  data_validade: string | null;
  valor_total: number | string;
  status: OrcamentoStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string } | null;
};

const mapRow = (r: Row): Orcamento => ({
  id: r.id,
  empresaRepresentadaId: r.empresa_representada_id,
  numero: r.numero,
  clienteId: r.cliente_id,
  clienteNome: r.clientes?.nome ?? null,
  dataEmissao: r.data_emissao,
  dataValidade: r.data_validade,
  valorTotal: Number(r.valor_total) || 0,
  status: r.status,
  observacoes: r.observacoes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const fetchOrcamentos = async (): Promise<Orcamento[]> => {
  const { data, error } = await supabase
    .from('orcamentos_venda')
    .select('*, clientes(nome)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as unknown as Row));
};

export const createOrcamento = async (input: OrcamentoInput): Promise<Orcamento> => {
  const { data: authUser } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('orcamentos_venda')
    .insert({
      empresa_representada_id: input.empresaRepresentadaId,
      numero: input.numero,
      cliente_id: input.clienteId ?? null,
      data_emissao: input.dataEmissao ?? new Date().toISOString().slice(0, 10),
      data_validade: input.dataValidade ?? null,
      valor_total: input.valorTotal ?? 0,
      status: input.status ?? 'rascunho',
      observacoes: input.observacoes ?? null,
      created_by: authUser.user?.id ?? null,
    })
    .select('*, clientes(nome)')
    .single();
  if (error) throw error;
  return mapRow(data as unknown as Row);
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
    valor_total?: number;
    status?: OrcamentoStatus;
    observacoes?: string | null;
  } = {};
  if (input.numero !== undefined) payload.numero = input.numero;
  if (input.clienteId !== undefined) payload.cliente_id = input.clienteId ?? null;
  if (input.dataEmissao !== undefined) payload.data_emissao = input.dataEmissao;
  if (input.dataValidade !== undefined) payload.data_validade = input.dataValidade ?? null;
  if (input.valorTotal !== undefined) payload.valor_total = input.valorTotal;
  if (input.status !== undefined) payload.status = input.status;
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes ?? null;
  const { data, error } = await supabase
    .from('orcamentos_venda')
    .update(payload)
    .eq('id', id)
    .select('*, clientes(nome)')
    .single();
  if (error) throw error;
  return mapRow(data as unknown as Row);
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
