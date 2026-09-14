
import { supabase } from "@/integrations/supabase/client";
import { getEmpresaAtivaIdOuFalha } from "@/lib/empresaAtiva";
import type { Database } from "@/integrations/supabase/types";
import { NaturezaOperacao } from "@/types/fiscal";

type NaturezaOperacaoUpdate = Database['public']['Tables']['natureza_operacao']['Update'];

console.log('[Fiscal] Inicializando serviço de naturezas de operação');

const mapRow = (item: any): NaturezaOperacao => ({
  id: item.id,
  codigo: item.codigo,
  descricao: item.descricao,
  tipo: item.tipo,
  finalidade: item.finalidade,
  cfopDentroEstado: item.cfop_dentro_estado,
  cfopForaEstado: item.cfop_fora_estado,
  cfopExterior: item.cfop_exterior,
  geraDuplicata: item.gera_duplicata,
  movimentaEstoque: item.movimenta_estoque,
  calculaIcms: item.calcula_icms,
  calculaIpi: item.calcula_ipi,
  calculaPisCofins: item.calcula_pis_cofins,
  observacoes: item.observacoes,
  ativo: item.ativo,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

export const fetchNaturezasOperacao = async (): Promise<NaturezaOperacao[]> => {
  console.log('[Fiscal] Buscando naturezas de operação');
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase
    .from('natureza_operacao')
    .select('*')
    .eq('empresa_representada_id', empresaId)
    .is('deleted_at', null)
    .order('codigo');

  if (error) {
    console.error('[Fiscal] Erro ao buscar naturezas de operação:', error);
    throw error;
  }

  if (!data) return [];

  return data.map(mapRow);
};

export type NaturezaOperacaoInput = Omit<NaturezaOperacao, 'id' | 'createdAt' | 'updatedAt'>;

const toRow = (input: Partial<NaturezaOperacaoInput>): NaturezaOperacaoUpdate => {
  const row: NaturezaOperacaoUpdate = {};
  if (input.codigo !== undefined) row.codigo = input.codigo;
  if (input.descricao !== undefined) row.descricao = input.descricao;
  if (input.tipo !== undefined) row.tipo = input.tipo;
  if (input.finalidade !== undefined) row.finalidade = input.finalidade;
  if (input.cfopDentroEstado !== undefined) row.cfop_dentro_estado = input.cfopDentroEstado || null;
  if (input.cfopForaEstado !== undefined) row.cfop_fora_estado = input.cfopForaEstado || null;
  if (input.cfopExterior !== undefined) row.cfop_exterior = input.cfopExterior || null;
  if (input.geraDuplicata !== undefined) row.gera_duplicata = input.geraDuplicata;
  if (input.movimentaEstoque !== undefined) row.movimenta_estoque = input.movimentaEstoque;
  if (input.calculaIcms !== undefined) row.calcula_icms = input.calculaIcms;
  if (input.calculaIpi !== undefined) row.calcula_ipi = input.calculaIpi;
  if (input.calculaPisCofins !== undefined) row.calcula_pis_cofins = input.calculaPisCofins;
  if (input.observacoes !== undefined) row.observacoes = input.observacoes || null;
  if (input.ativo !== undefined) row.ativo = input.ativo;
  return row;
};

export const createNaturezaOperacao = async (input: NaturezaOperacaoInput): Promise<NaturezaOperacao> => {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase
    .from('natureza_operacao')
    .insert({
      ...toRow(input),
      codigo: input.codigo,
      descricao: input.descricao,
      tipo: input.tipo,
      finalidade: input.finalidade,
      empresa_representada_id: empresaId,
    })
    .select('*')
    .single();
  if (error) {
    console.error('[Fiscal] Erro ao criar natureza de operação:', error);
    throw error;
  }
  return mapRow(data);
};

export const updateNaturezaOperacao = async (
  id: string,
  input: Partial<NaturezaOperacaoInput>,
): Promise<NaturezaOperacao> => {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase
    .from('natureza_operacao')
    .update(toRow(input))
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .select('*')
    .single();
  if (error) {
    console.error('[Fiscal] Erro ao atualizar natureza de operação:', error);
    throw error;
  }
  return mapRow(data);
};
