
import { supabase } from '@/integrations/supabase/client';
import { Cargo } from '@/types/rh';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export const cargoService = {
  async fetchCargos() {
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar cargos:', error);
      throw new Error('Não foi possível carregar os cargos.');
    }

    return data || [];
  },

  async createCargo(cargoData: Cargo) {
    const empresaId = await getEmpresaIdAtual();

    const dataToSave = {
      empresa_representada_id: empresaId,
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

    return data;
  },

  async updateCargo(id: string, cargoData: Cargo) {
    
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

    return data;
  },

  async deleteCargo(id: string) {
    
    const { error } = await supabase
      .from('cargos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[RH] Erro ao excluir cargo:', error);
      throw new Error('Não foi possível excluir o cargo.');
    }

  }
};
