import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';
import type {
  OrdemFabricacao,
  CriarOrdemFabricacaoInput,
  ConcluirOrdemFabricacaoInput,
  ConcluirOrdemFabricacaoResultado,
} from '@/types/producao';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para esta operação.');
  }
  if (msg.startsWith('FICHA_TECNICA_INVALIDA')) {
    return new Error('Selecione uma ficha técnica ativa válida.');
  }
  if (msg.startsWith('FICHA_SEM_ITENS')) {
    return new Error('Esta ficha técnica não tem insumos cadastrados.');
  }
  if (msg.startsWith('LOCALIZACAO_CONSUMO_INVALIDA') || msg.startsWith('LOCALIZACAO_PRODUCAO_INVALIDA')) {
    return new Error('Selecione uma localização de estoque válida.');
  }
  if (msg.startsWith('ORDEM_JA_FINALIZADA')) {
    return new Error('Esta ordem de fabricação já foi concluída ou cancelada.');
  }
  if (msg.startsWith('ORDEM_NAO_PODE_SER_CANCELADA')) {
    return new Error('Só é possível cancelar uma ordem que ainda não consumiu nenhum insumo.');
  }
  if (msg.startsWith('QUANTIDADE_CONSUMIDA_INVALIDA')) {
    return new Error('Quantidade consumida inválida.');
  }
  if (msg.startsWith('SALDO_INSUFICIENTE')) {
    return new Error('Saldo insuficiente de um dos insumos na localização de consumo.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const ordemFabricacaoService = {
  async list(): Promise<OrdemFabricacao[]> {
    const { data, error } = await supabase
      .from('ordens_fabricacao')
      .select('*, consumos:ordens_fabricacao_consumos(*)')
      .order('data_abertura', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar ordens de fabricação');
    return (data || []) as unknown as OrdemFabricacao[];
  },

  async criar(input: CriarOrdemFabricacaoInput): Promise<string> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase.rpc('criar_ordem_fabricacao', {
      p_empresa_id: empresaId,
      p_ficha_tecnica_id: input.ficha_tecnica_id,
      p_quantidade_planejada: input.quantidade_planejada,
      p_localizacao_consumo_id: input.localizacao_consumo_id,
      p_localizacao_producao_id: input.localizacao_producao_id,
      p_centro_custo_id: input.centro_custo_id ?? null,
      p_observacoes: input.observacoes ?? null,
    });
    if (error) throw translateError(error, 'Erro ao abrir ordem de fabricação');
    return data as string;
  },

  async concluir(input: ConcluirOrdemFabricacaoInput): Promise<ConcluirOrdemFabricacaoResultado> {
    const { data, error } = await supabase.rpc('concluir_ordem_fabricacao', {
      p_ordem_id: input.ordem_id,
      p_quantidade_produzida: input.quantidade_produzida,
      p_consumos: (input.consumos ?? null) as unknown as Json,
    });
    if (error) throw translateError(error, 'Erro ao concluir ordem de fabricação');
    return data as unknown as ConcluirOrdemFabricacaoResultado;
  },

  async cancelar(ordemId: string, motivo: string): Promise<void> {
    const { error } = await supabase.rpc('cancelar_ordem_fabricacao', {
      p_ordem_id: ordemId,
      p_motivo: motivo,
    });
    if (error) throw translateError(error, 'Erro ao cancelar ordem de fabricação');
  },
};
