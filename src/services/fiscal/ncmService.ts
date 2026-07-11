import { supabase } from "@/integrations/supabase/client";
import { NCM } from "@/types/fiscal";

type NCMRow = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  aliquota_ipi: number | string | null;
  categoria: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

const mapRow = (item: NCMRow): NCM => ({
  id: item.id,
  codigo: item.codigo,
  descricao: item.descricao,
  unidade: item.unidade ?? undefined,
  aliquotaIpi: parseFloat(String(item.aliquota_ipi ?? '0')) || 0,
  categoria: item.categoria ?? undefined,
  observacoes: item.observacoes ?? undefined,
  ativo: item.ativo,
  createdAt: item.created_at,
});

export const fetchNCMs = async (): Promise<NCM[]> => {
  const { data, error } = await supabase.from('ncm').select('*').order('codigo');
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as NCMRow));
};

export const fetchNCMById = async (id: string): Promise<NCM | null> => {
  const { data, error } = await supabase.from('ncm').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as NCMRow) : null;
};

export type NCMInput = Omit<NCM, 'id' | 'createdAt'>;

export const createNCM = async (input: NCMInput): Promise<NCM> => {
  const { data, error } = await supabase
    .from('ncm')
    .insert({
      codigo: input.codigo,
      descricao: input.descricao,
      unidade: input.unidade ?? null,
      aliquota_ipi: input.aliquotaIpi ?? 0,
      categoria: input.categoria ?? null,
      observacoes: input.observacoes ?? null,
      ativo: input.ativo ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow(data as NCMRow);
};

export const updateNCM = async (id: string, input: Partial<NCMInput>): Promise<NCM> => {
  const payload: {
    codigo?: string;
    descricao?: string;
    unidade?: string | null;
    aliquota_ipi?: number;
    categoria?: string | null;
    observacoes?: string | null;
    ativo?: boolean;
  } = {};
  if (input.codigo !== undefined) payload.codigo = input.codigo;
  if (input.descricao !== undefined) payload.descricao = input.descricao;
  if (input.unidade !== undefined) payload.unidade = input.unidade ?? null;
  if (input.aliquotaIpi !== undefined) payload.aliquota_ipi = input.aliquotaIpi;
  if (input.categoria !== undefined) payload.categoria = input.categoria ?? null;
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes ?? null;
  if (input.ativo !== undefined) payload.ativo = input.ativo;
  const { data, error } = await supabase.from('ncm').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return mapRow(data as NCMRow);
};

export const toggleNCMAtivo = async (id: string, ativo: boolean): Promise<void> => {
  const { error } = await supabase.from('ncm').update({ ativo }).eq('id', id);
  if (error) throw error;
};

export const consultarNCMExterno = async (codigo: string) => {
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados`);
    if (!response.ok) throw new Error('Erro na consulta externa');
    return null;
  } catch (error) {
    console.error('[Fiscal] Erro na consulta NCM externa:', error);
    return null;
  }
};
