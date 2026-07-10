
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import type { 
  NaturezaCaixa, 
  NaturezaCaixaInput,
  ModalidadeCaixa,
  ModalidadeCaixaInput,
  PlanoPagamento,
  PlanoPagamentoInput,
  ModalidadeAPIVinculo,
  ModalidadeAPIVinculoInput
} from '@/types/configBasicas';

console.log('[ConfigBasicasService] Serviços inicializados');

// ==================== NATUREZA CAIXAS ====================

export const naturezaCaixasService = {
  async getAll(): Promise<NaturezaCaixa[]> {
    console.log('[ConfigBasicasService] Buscando naturezas de caixa');
    const { data, error } = await supabase
      .from('natureza_caixas')
      .select('*')
      .is('deleted_at', null)
      .order('nome');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar naturezas:', error);
      throw error;
    }

    return data || [];
  },

  async create(input: NaturezaCaixaInput): Promise<NaturezaCaixa> {
    console.log('[ConfigBasicasService] Criando natureza de caixa:', input);
    const { data, error } = await supabase
      .from('natureza_caixas')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar natureza:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<NaturezaCaixaInput>): Promise<NaturezaCaixa> {
    console.log('[ConfigBasicasService] Atualizando natureza de caixa:', id, input);
    const { data, error } = await supabase
      .from('natureza_caixas')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao atualizar natureza:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    console.log('[ConfigBasicasService] Excluindo natureza de caixa:', id);
    const { error } = await supabase
      .from('natureza_caixas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ConfigBasicasService] Erro ao excluir natureza:', error);
      throw error;
    }
  }
};

// ==================== MODALIDADE CAIXAS ====================

export const modalidadeCaixasService = {
  async getAll(apenasAtivos = false): Promise<ModalidadeCaixa[]> {
    console.log('[ConfigBasicasService] Buscando modalidades de caixa, apenas ativos:', apenasAtivos);
    let query = supabase
      .from('modalidade_caixas')
      .select('*')
      .is('deleted_at', null);

    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query.order('nome');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar modalidades:', error);
      throw error;
    }

    return data || [];
  },

  async search(termo: string, apenasAtivos = false): Promise<ModalidadeCaixa[]> {
    console.log('[ConfigBasicasService] Buscando modalidades por termo:', termo);
    let query = supabase
      .from('modalidade_caixas')
      .select('*')
      .is('deleted_at', null)
      .ilike('nome', `%${termo}%`);

    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query.order('nome');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar modalidades:', error);
      throw error;
    }

    return data || [];
  },

  async create(input: ModalidadeCaixaInput): Promise<ModalidadeCaixa> {
    console.log('[ConfigBasicasService] Criando modalidade de caixa:', input);
    const { data, error } = await supabase
      .from('modalidade_caixas')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar modalidade:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<ModalidadeCaixaInput>): Promise<ModalidadeCaixa> {
    console.log('[ConfigBasicasService] Atualizando modalidade de caixa:', id, input);
    const { data, error } = await supabase
      .from('modalidade_caixas')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao atualizar modalidade:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    console.log('[ConfigBasicasService] Excluindo modalidade de caixa:', id);
    const { error } = await supabase
      .from('modalidade_caixas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ConfigBasicasService] Erro ao excluir modalidade:', error);
      throw error;
    }
  }
};

// ==================== PLANOS PAGAMENTO ====================

export const planosPagamentoService = {
  async getAll(): Promise<PlanoPagamento[]> {
    console.log('[ConfigBasicasService] Buscando planos de pagamento');
    const { data, error } = await supabase
      .from('planos_pagamento')
      .select('*')
      .is('deleted_at', null)
      .order('nome_plano');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar planos:', error);
      throw error;
    }

    return data || [];
  },

  async create(input: PlanoPagamentoInput): Promise<PlanoPagamento> {
    console.log('[ConfigBasicasService] Criando plano de pagamento:', input);
    const { data, error } = await supabase
      .from('planos_pagamento')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar plano:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<PlanoPagamentoInput>): Promise<PlanoPagamento> {
    console.log('[ConfigBasicasService] Atualizando plano de pagamento:', id, input);
    const { data, error } = await supabase
      .from('planos_pagamento')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao atualizar plano:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    console.log('[ConfigBasicasService] Excluindo plano de pagamento:', id);
    const { error } = await supabase
      .from('planos_pagamento')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ConfigBasicasService] Erro ao excluir plano:', error);
      throw error;
    }
  }
};

// ==================== MODALIDADE API VINCULO ====================

export const modalidadeAPIVinculoService = {
  async getAll(): Promise<ModalidadeAPIVinculo[]> {
    console.log('[ConfigBasicasService] Buscando modalidades API vínculo');
    const { data, error } = await supabase
      .from('modalidade_api_vinculo')
      .select('*')
      .is('deleted_at', null)
      .order('nome');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar modalidades API:', error);
      throw error;
    }

    return data || [];
  },

  async create(input: ModalidadeAPIVinculoInput): Promise<ModalidadeAPIVinculo> {
    console.log('[ConfigBasicasService] Criando modalidade API vínculo:', input);
    const { data, error } = await supabase
      .from('modalidade_api_vinculo')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar modalidade API:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<ModalidadeAPIVinculoInput>): Promise<ModalidadeAPIVinculo> {
    console.log('[ConfigBasicasService] Atualizando modalidade API vínculo:', id, input);
    const { data, error } = await supabase
      .from('modalidade_api_vinculo')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao atualizar modalidade API:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    console.log('[ConfigBasicasService] Excluindo modalidade API vínculo:', id);
    const { error } = await supabase
      .from('modalidade_api_vinculo')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ConfigBasicasService] Erro ao excluir modalidade API:', error);
      throw error;
    }
  }
};
