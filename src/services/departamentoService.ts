
import { supabase } from '@/integrations/supabase/client';
import { Departamento } from '@/types/rh';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export const departamentoService = {
  async fetchDepartamentos() {
    const { data, error } = await supabase
      .from('departamentos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar departamentos:', error);
      throw new Error('Não foi possível carregar os departamentos.');
    }

    return data || [];
  },

  async createDepartamento(departamentoData: Departamento) {
    const empresaId = await getEmpresaIdAtual();

    const dataToSave = {
      empresa_representada_id: empresaId,
      nome: departamentoData.nome,
      descricao: departamentoData.descricao || null,
      responsavel_id: departamentoData.responsavelId || null,
      ativo: departamentoData.ativo ?? true,
      updated_at: new Date().toISOString()
    };


    const { data, error } = await supabase
      .from('departamentos')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro detalhado ao criar departamento:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    return data;
  },

  async updateDepartamento(id: string, departamentoData: Departamento) {
    
    const dataToSave = {
      nome: departamentoData.nome,
      descricao: departamentoData.descricao || null,
      responsavel_id: departamentoData.responsavelId || null,
      ativo: departamentoData.ativo ?? true,
      updated_at: new Date().toISOString()
    };


    const { data, error } = await supabase
      .from('departamentos')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro detalhado ao atualizar departamento:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    return data;
  },

  async deleteDepartamento(id: string) {
    
    const { error } = await supabase
      .from('departamentos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[RH] Erro detalhado ao excluir departamento:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error('Não foi possível excluir o departamento.');
    }

  }
};
