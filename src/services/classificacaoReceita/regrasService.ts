import { supabase } from '@/integrations/supabase/client';
import type { RegraClassificacaoReceita, RegraClassificacaoInput } from '@/types/classificacaoReceita';


export const listarRegras = async (empresaId: string): Promise<RegraClassificacaoReceita[]> => {
  const { data, error } = await supabase
    .from('regras_classificacao_receita')
    .select('*')
    .eq('empresa_representada_id', empresaId)
    .is('deleted_at', null)
    .order('prioridade', { ascending: true });
  if (error) throw error;
  return (data || []) as RegraClassificacaoReceita[];
};

export const criarRegra = async (input: RegraClassificacaoInput): Promise<RegraClassificacaoReceita> => {
  const { data, error } = await supabase
    .from('regras_classificacao_receita')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as RegraClassificacaoReceita;
};

export const atualizarRegra = async (id: string, input: Partial<RegraClassificacaoInput>, empresaId: string): Promise<RegraClassificacaoReceita> => {
  const { data, error } = await supabase
    .from('regras_classificacao_receita')
    .update(input)
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .select('*')
    .single();
  if (error) throw error;
  return data as RegraClassificacaoReceita;
};

export const excluirRegra = async (id: string, empresaId: string): Promise<void> => {
  const { error } = await supabase
    .from('regras_classificacao_receita')
    .update({ deleted_at: new Date().toISOString(), ativo: false })
    .eq('id', id)
    .eq('empresa_representada_id', empresaId);
  if (error) throw error;
};

export const resolverClassificacaoItem = async (itemId: string) => {
  const { data, error } = await supabase.rpc('resolver_classificacao_receita', { p_item_id: itemId });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as {
    plano_conta_id: string;
    centro_custo_id: string | null;
    natureza_receita_id: string | null;
    regra_origem: string;
    regra_versao: number;
    hash_classificacao: string;
  };
};
