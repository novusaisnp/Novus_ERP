
import { supabase } from "@/integrations/supabase/client";
import { getEmpresaAtivaIdOuFalha } from "@/lib/empresaAtiva";
import type { Database } from "@/integrations/supabase/types";
import { Tributo } from "@/types/fiscal";

console.log('[Fiscal] Inicializando serviço de tributos');

type TributoUpdate = Database['public']['Tables']['tributos']['Update'];

const mapRow = (item: any): Tributo => ({
  id: item.id,
  descricao: item.descricao,
  tipo: item.tipo,
  subtipo: item.subtipo,
  aliquota: parseFloat(item.aliquota || '0'),
  baseCalculo: parseFloat(item.base_calculo || '100'),
  uf: item.uf,
  regimeTributario: item.regime_tributario,
  ncmInicio: item.ncm_inicio,
  ncmFim: item.ncm_fim,
  dataInicio: item.data_inicio,
  dataFim: item.data_fim,
  observacoes: item.observacoes,
  ativo: item.ativo,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

export const fetchTributos = async (): Promise<Tributo[]> => {
  console.log('[Fiscal] Buscando tributos');
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase
    .from('tributos')
    .select('*')
    .eq('empresa_representada_id', empresaId)
    .is('deleted_at', null)
    .order('tipo', { ascending: true });

  if (error) {
    console.error('[Fiscal] Erro ao buscar tributos:', error);
    throw error;
  }

  if (!data) return [];

  return data.map(mapRow);
};

export type TributoInput = Omit<Tributo, 'id' | 'createdAt' | 'updatedAt'>;

const toRow = (input: Partial<TributoInput>): TributoUpdate => {
  const row: TributoUpdate = {};
  if (input.descricao !== undefined) row.descricao = input.descricao;
  if (input.tipo !== undefined) row.tipo = input.tipo;
  if (input.subtipo !== undefined) row.subtipo = input.subtipo || null;
  if (input.aliquota !== undefined) row.aliquota = input.aliquota;
  if (input.baseCalculo !== undefined) row.base_calculo = input.baseCalculo;
  if (input.uf !== undefined) row.uf = input.uf || null;
  if (input.regimeTributario !== undefined) row.regime_tributario = input.regimeTributario || null;
  if (input.ncmInicio !== undefined) row.ncm_inicio = input.ncmInicio || null;
  if (input.ncmFim !== undefined) row.ncm_fim = input.ncmFim || null;
  if (input.dataInicio !== undefined) row.data_inicio = input.dataInicio;
  if (input.dataFim !== undefined) row.data_fim = input.dataFim || null;
  if (input.observacoes !== undefined) row.observacoes = input.observacoes || null;
  if (input.ativo !== undefined) row.ativo = input.ativo;
  return row;
};

export const createTributo = async (input: TributoInput): Promise<Tributo> => {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase
    .from('tributos')
    .insert({
      ...toRow(input),
      descricao: input.descricao,
      tipo: input.tipo,
      data_inicio: input.dataInicio,
      empresa_representada_id: empresaId,
    })
    .select('*')
    .single();
  if (error) {
    console.error('[Fiscal] Erro ao criar tributo:', error);
    throw error;
  }
  return mapRow(data);
};

export const updateTributo = async (id: string, input: Partial<TributoInput>): Promise<Tributo> => {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data, error } = await supabase
    .from('tributos')
    .update(toRow(input))
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .select('*')
    .single();
  if (error) {
    console.error('[Fiscal] Erro ao atualizar tributo:', error);
    throw error;
  }
  return mapRow(data);
};

export const deleteTributo = async (id: string): Promise<void> => {
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { error } = await supabase
    .from('tributos')
    .update({ deleted_at: new Date().toISOString(), ativo: false })
    .eq('id', id)
    .eq('empresa_representada_id', empresaId);
  if (error) {
    console.error('[Fiscal] Erro ao remover tributo:', error);
    throw error;
  }
};
