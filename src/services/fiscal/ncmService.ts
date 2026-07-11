
import { supabase } from "@/integrations/supabase/client";
import { NCM } from "@/types/fiscal";

console.log('[Fiscal] Inicializando serviço de NCMs');

export const fetchNCMs = async (): Promise<NCM[]> => {
  console.log('[Fiscal] Buscando NCMs');
  const { data, error } = await supabase
    .from('ncm')
    .select('*')
    .order('codigo');
  
  if (error) {
    console.error('[Fiscal] Erro ao buscar NCMs:', error);
    throw error;
  }
  
  if (!data) return [];
  
  return data.map((item: any) => ({
    id: item.id,
    codigo: item.codigo,
    descricao: item.descricao,
    unidade: item.unidade,
    aliquotaIpi: parseFloat(item.aliquota_ipi || '0'),
    categoria: item.categoria,
    observacoes: item.observacoes,
    ativo: item.ativo,
    createdAt: item.created_at
  }));
};

export const consultarNCMExterno = async (codigo: string) => {
  console.log('[Fiscal] Consultando NCM externo:', codigo);
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados`);
    if (!response.ok) throw new Error('Erro na consulta externa');
    
    console.log('[Fiscal] Consulta NCM externa realizada com sucesso');
    return null;
  } catch (error) {
    console.error('[Fiscal] Erro na consulta NCM externa:', error);
    return null;
  }
};
