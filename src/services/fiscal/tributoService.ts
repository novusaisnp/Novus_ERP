
import { supabase } from "@/integrations/supabase/client";
import { Tributo } from "@/types/fiscal";

console.log('[Fiscal] Inicializando serviço de tributos');

export const fetchTributos = async (): Promise<Tributo[]> => {
  console.log('[Fiscal] Buscando tributos');
  const { data, error } = await supabase
    .from('tributos')
    .select('*')
    .order('tipo', { ascending: true });
  
  if (error) {
    console.error('[Fiscal] Erro ao buscar tributos:', error);
    throw error;
  }
  
  if (!data) return [];
  
  return data.map((item: any) => ({
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
    updatedAt: item.updated_at
  }));
};
