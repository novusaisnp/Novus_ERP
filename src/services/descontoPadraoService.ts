
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { DescontoPadrao } from '@/types/rh';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export const descontoPadraoService = {
  async fetchDescontos() {
    console.log('[DescontosPadrao] Carregando descontos padrão...');
    const { data, error } = await supabase
      .from('descontos_padrao')
      .select('*')
      .eq('ativo', true)
      .order('codigo');

    if (error) {
      console.error('[DescontosPadrao] Erro ao carregar descontos padrão:', error);
      throw new Error('Não foi possível carregar os descontos padrão.');
    }

    console.log('[DescontosPadrao] Descontos padrão carregados:', data?.length || 0);
    return data || [];
  },

  async createDesconto(descontoData: DescontoPadrao) {
    console.log('[DescontosPadrao] Criando desconto padrão:', descontoData.codigo);
    const empresaId = await getEmpresaIdAtual();

    const dataToSave = {
      empresa_representada_id: empresaId,
      codigo: descontoData.codigo,
      nome: descontoData.descricao,
      descricao: descontoData.descricao,
      tipo: descontoData.tipo,
      valor: descontoData.valor || 0,
      percentual: descontoData.percentual || 0,
      tabela_progressiva: (descontoData.tabelaProgressiva ?? null) as Json,
      ativo: descontoData.ativo,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('descontos_padrao')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('[DescontosPadrao] Erro ao criar desconto padrão:', error);
      throw error;
    }

    console.log('[DescontosPadrao] Desconto padrão criado com sucesso');
    return data;
  },

  async updateDesconto(id: string, descontoData: DescontoPadrao) {
    console.log('[DescontosPadrao] Atualizando desconto padrão:', id);
    
    const dataToSave = {
      codigo: descontoData.codigo,
      nome: descontoData.descricao,
      descricao: descontoData.descricao,
      tipo: descontoData.tipo,
      valor: descontoData.valor || 0,
      percentual: descontoData.percentual || 0,
      tabela_progressiva: (descontoData.tabelaProgressiva ?? null) as Json,
      ativo: descontoData.ativo,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('descontos_padrao')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DescontosPadrao] Erro ao atualizar desconto padrão:', error);
      throw error;
    }

    console.log('[DescontosPadrao] Desconto padrão atualizado com sucesso');
    return data;
  },

  async deleteDesconto(id: string) {
    console.log('[DescontosPadrao] Excluindo desconto padrão:', id);
    
    const { error } = await supabase
      .from('descontos_padrao')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[DescontosPadrao] Erro ao excluir desconto padrão:', error);
      throw new Error('Não foi possível excluir o desconto padrão.');
    }

    console.log('[DescontosPadrao] Desconto padrão excluído com sucesso');
  }
};
