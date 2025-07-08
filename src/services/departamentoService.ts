
import { supabase } from '@/integrations/supabase/client';
import { Departamento } from '@/types/rh';

export const departamentoService = {
  async fetchDepartamentos() {
    console.log('[RH] Carregando departamentos...');
    const { data, error } = await supabase
      .from('departamentos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar departamentos:', error);
      throw new Error('Não foi possível carregar os departamentos.');
    }

    console.log('[RH] Departamentos carregados:', data?.length || 0);
    return data || [];
  },

  async createDepartamento(departamentoData: Departamento) {
    console.log('[RH] Criando departamento:', departamentoData.nome);
    console.log('[RH] Dados recebidos para criação:', departamentoData);
    
    const dataToSave = {
      nome: departamentoData.nome,
      descricao: departamentoData.descricao || null,
      // Removendo empresa_representada_id por enquanto para evitar problemas de FK
      // empresa_representada_id: departamentoData.empresaRepresentadaId || null,
      ativo: departamentoData.ativo ?? true,
      updated_at: new Date().toISOString()
    };

    console.log('[RH] Dados que serão salvos:', dataToSave);

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

    console.log('[RH] Departamento criado com sucesso:', data);
    return data;
  },

  async updateDepartamento(id: string, departamentoData: Departamento) {
    console.log('[RH] Atualizando departamento:', id);
    console.log('[RH] Dados recebidos para atualização:', departamentoData);
    
    const dataToSave = {
      nome: departamentoData.nome,
      descricao: departamentoData.descricao || null,
      // Removendo empresa_representada_id por enquanto para evitar problemas de FK
      // empresa_representada_id: departamentoData.empresaRepresentadaId || null,
      ativo: departamentoData.ativo ?? true,
      updated_at: new Date().toISOString()
    };

    console.log('[RH] Dados que serão atualizados:', dataToSave);

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

    console.log('[RH] Departamento atualizado com sucesso:', data);
    return data;
  },

  async deleteDepartamento(id: string) {
    console.log('[RH] Excluindo departamento:', id);
    
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

    console.log('[RH] Departamento excluído com sucesso');
  }
};
