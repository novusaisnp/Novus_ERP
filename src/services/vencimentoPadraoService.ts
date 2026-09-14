
import { supabase } from '@/integrations/supabase/client';
import { VencimentoPadrao } from '@/types/rh';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export const vencimentoPadraoService = {
  async fetchVencimentos() {
    console.log('[RH] Carregando vencimentos padrão...');
    const empresaId = await getEmpresaIdAtual();
    const { data, error } = await supabase
      .from('vencimentos_padrao')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .eq('ativo', true)
      .order('codigo');

    if (error) {
      console.error('[RH] Erro ao carregar vencimentos padrão:', error);
      throw new Error('Não foi possível carregar os vencimentos padrão.');
    }

    console.log('[RH] Vencimentos padrão carregados:', data?.length || 0);
    return data || [];
  },

  async createVencimento(vencimentoData: VencimentoPadrao) {
    console.log('[RH] Criando vencimento padrão:', vencimentoData.codigo);
    const empresaId = await getEmpresaIdAtual();

    const dataToSave = {
      empresa_representada_id: empresaId,
      codigo: vencimentoData.codigo,
      nome: vencimentoData.descricao,
      descricao: vencimentoData.descricao,
      tipo: vencimentoData.tipo,
      valor: vencimentoData.valor || 0,
      percentual: vencimentoData.percentual || 0,
      incide_inss: vencimentoData.incideInss,
      incide_irrf: vencimentoData.incideIrrf,
      incide_fgts: vencimentoData.incideFgts,
      ativo: vencimentoData.ativo,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vencimentos_padrao')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao criar vencimento padrão:', error);
      throw error;
    }

    console.log('[RH] Vencimento padrão criado com sucesso');
    return data;
  },

  async updateVencimento(id: string, vencimentoData: VencimentoPadrao) {
    console.log('[RH] Atualizando vencimento padrão:', id);
    const empresaId = await getEmpresaIdAtual();
    const dataToSave = {
      codigo: vencimentoData.codigo,
      descricao: vencimentoData.descricao,
      tipo: vencimentoData.tipo,
      valor: vencimentoData.valor || 0,
      percentual: vencimentoData.percentual || 0,
      incide_inss: vencimentoData.incideInss,
      incide_irrf: vencimentoData.incideIrrf,
      incide_fgts: vencimentoData.incideFgts,
      ativo: vencimentoData.ativo,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('vencimentos_padrao')
      .update(dataToSave)
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao atualizar vencimento padrão:', error);
      throw error;
    }

    console.log('[RH] Vencimento padrão atualizado com sucesso');
    return data;
  },

  async deleteVencimento(id: string) {
    console.log('[RH] Excluindo vencimento padrão:', id);
    const empresaId = await getEmpresaIdAtual();
    const { error } = await supabase
      .from('vencimentos_padrao')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId);

    if (error) {
      console.error('[RH] Erro ao excluir vencimento padrão:', error);
      throw new Error('Não foi possível excluir o vencimento padrão.');
    }

    console.log('[RH] Vencimento padrão excluído com sucesso');
  }
};
