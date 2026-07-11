
import { supabase } from "@/integrations/supabase/client";
import { CFOP } from "@/types/fiscal";

console.log('[Fiscal] Inicializando serviço de CFOPs');

export const fetchCFOPs = async (): Promise<CFOP[]> => {
  console.log('[Fiscal] Buscando CFOPs');
  const { data, error } = await supabase
    .from('cfop')
    .select('*')
    .order('codigo');
  
  if (error) {
    console.error('[Fiscal] Erro ao buscar CFOPs:', error);
    throw error;
  }
  
  if (!data) return [];
  
  return data.map((item: any) => ({
    id: item.id,
    codigo: item.codigo,
    descricao: item.descricao,
    aplicacao: item.aplicacao,
    destino: item.destino,
    tipo: item.tipo,
    categoria: item.categoria,
    ativo: item.ativo,
    createdAt: item.created_at
  }));
};
