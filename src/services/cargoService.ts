
import { supabase } from '@/integrations/supabase/client';
import { Cargo } from '@/types/rh';

export const cargoService = {
  async fetchCargos() {
    console.log('[RH] Carregando cargos...');
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar cargos:', error);
      throw new Error('Não foi possível carregar os cargos.');
    }

    console.log('[RH] Cargos carregados:', data?.length || 0);
    return data || [];
  },

  async createCargo(cargoData: Cargo) {
    console.log('[RH] Criando cargo:', cargoData.nome);
    
    const dataToSave = {
      nome: cargoData.nome,
      descricao: cargoData.descricao,
      salario_base: cargoData.salarioBase,
      ativo: cargoData.ativo,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cargos')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao criar cargo:', error);
      throw error;
    }

    console.log('[RH] Cargo criado com sucesso');
    return data;
  },

  async updateCargo(id: string, cargoData: Cargo) {
    console.log('[RH] Atualizando cargo:', id);
    
    const dataToSave = {
      nome: cargoData.nome,
      descricao: cargoData.descricao,
      salario_base: cargoData.salarioBase,
      ativo: cargoData.ativo,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cargos')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao atualizar cargo:', error);
      throw error;
    }

    console.log('[RH] Cargo atualizado com sucesso');
    return data;
  },

  async deleteCargo(id: string) {
    console.log('[RH] Excluindo cargo:', id);
    
    const { error } = await supabase
      .from('cargos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[RH] Erro ao excluir cargo:', error);
      throw new Error('Não foi possível excluir o cargo.');
    }

    console.log('[RH] Cargo excluído com sucesso');
  }
};
