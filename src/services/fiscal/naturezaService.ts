
import { supabase } from "@/integrations/supabase/client";
import { NaturezaOperacao } from "@/types/fiscal";

console.log('[Fiscal] Inicializando serviço de naturezas de operação');

export const fetchNaturezasOperacao = async (): Promise<NaturezaOperacao[]> => {
  console.log('[Fiscal] Buscando naturezas de operação');
  const { data, error } = await supabase
    .from('natureza_operacao')
    .select('*')
    .order('codigo');
  
  if (error) {
    console.error('[Fiscal] Erro ao buscar naturezas de operação:', error);
    throw error;
  }
  
  if (!data) return [];
  
  return data.map((item: any) => ({
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
    updatedAt: item.updated_at
  }));
};
