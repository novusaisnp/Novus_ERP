import { supabase } from "@/integrations/supabase/client";
import { CFOP } from "@/types/fiscal";

type CFOPRow = {
  id: string;
  codigo: string;
  descricao: string;
  aplicacao: string | null;
  destino: 'interno' | 'interestadual' | 'exterior';
  tipo: 'entrada' | 'saida';
  categoria: string | null;
  ativo: boolean;
  created_at: string;
};

const mapRow = (item: CFOPRow): CFOP => ({
  id: item.id,
  codigo: item.codigo,
  descricao: item.descricao,
  aplicacao: item.aplicacao ?? undefined,
  destino: item.destino,
  tipo: item.tipo,
  categoria: item.categoria ?? undefined,
  ativo: item.ativo,
  createdAt: item.created_at,
});

export const fetchCFOPs = async (): Promise<CFOP[]> => {
  const { data, error } = await supabase
    .from('cfop')
    .select('*')
    .order('codigo');
  if (error) throw error;
  return (data ?? []).map(mapRow as any);
};

export const fetchCFOPById = async (id: string): Promise<CFOP | null> => {
  const { data, error } = await supabase
    .from('cfop')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as any) : null;
};

export type CFOPInput = Omit<CFOP, 'id' | 'createdAt'>;

export const createCFOP = async (input: CFOPInput): Promise<CFOP> => {
  const { data, error } = await supabase
    .from('cfop')
    .insert({
      codigo: input.codigo,
      descricao: input.descricao,
      aplicacao: input.aplicacao ?? null,
      destino: input.destino,
      tipo: input.tipo,
      categoria: input.categoria ?? null,
      ativo: input.ativo ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data as any);
};

export const updateCFOP = async (id: string, input: Partial<CFOPInput>): Promise<CFOP> => {
  const payload: any = {};
  if (input.codigo !== undefined) payload.codigo = input.codigo;
  if (input.descricao !== undefined) payload.descricao = input.descricao;
  if (input.aplicacao !== undefined) payload.aplicacao = input.aplicacao ?? null;
  if (input.destino !== undefined) payload.destino = input.destino;
  if (input.tipo !== undefined) payload.tipo = input.tipo;
  if (input.categoria !== undefined) payload.categoria = input.categoria ?? null;
  if (input.ativo !== undefined) payload.ativo = input.ativo;
  const { data, error } = await supabase
    .from('cfop')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data as any);
};

export const toggleCFOPAtivo = async (id: string, ativo: boolean): Promise<void> => {
  const { error } = await supabase.from('cfop').update({ ativo }).eq('id', id);
  if (error) throw error;
};
