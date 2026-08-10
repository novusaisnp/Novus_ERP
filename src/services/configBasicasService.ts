
import { supabase } from '@/integrations/supabase/client';
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
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';


// ==================== NATUREZA CAIXAS ====================

export const naturezaCaixasService = {
  async getAll(): Promise<NaturezaCaixa[]> {
    const { data, error } = await supabase
      .from('natureza_caixas')
      .select('*')
      .order('nome');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar naturezas:', error);
      throw error;
    }

    return data || [];
  },

  async create(input: NaturezaCaixaInput): Promise<NaturezaCaixa> {
    const empresaId = await getEmpresaIdAtual();
    const { data, error } = await supabase
      .from('natureza_caixas')
      .insert([{ ...input, empresa_representada_id: empresaId }])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar natureza:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<NaturezaCaixaInput>): Promise<NaturezaCaixa> {
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
    const { error } = await supabase
      .from('natureza_caixas')
      .update({ ativo: false })
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
    let query = supabase
      .from('modalidade_caixas')
      .select('*');

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
    let query = supabase
      .from('modalidade_caixas')
      .select('*')
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
    const empresaId = await getEmpresaIdAtual();
    const { data, error } = await supabase
      .from('modalidade_caixas')
      .insert([{ ...input, empresa_representada_id: empresaId }])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar modalidade:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<ModalidadeCaixaInput>): Promise<ModalidadeCaixa> {
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
    const { error } = await supabase
      .from('modalidade_caixas')
      .update({ ativo: false })
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
    const { data, error } = await supabase
      .from('planos_pagamento')
      .select('*')
      .is('deleted_at', null)
      .order('nome');

    if (error) {
      console.error('[ConfigBasicasService] Erro ao buscar planos:', error);
      throw error;
    }

    return data || [];
  },

  async create(input: PlanoPagamentoInput): Promise<PlanoPagamento> {
    const empresaId = await getEmpresaIdAtual();
    const { data, error } = await supabase
      .from('planos_pagamento')
      .insert([{ ...input, empresa_representada_id: empresaId }])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar plano:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<PlanoPagamentoInput>): Promise<PlanoPagamento> {
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
    const empresaId = await getEmpresaIdAtual();
    const { data, error } = await supabase
      .from('modalidade_api_vinculo')
      .insert([{ ...input, empresa_representada_id: empresaId }])
      .select()
      .single();

    if (error) {
      console.error('[ConfigBasicasService] Erro ao criar modalidade API:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: Partial<ModalidadeAPIVinculoInput>): Promise<ModalidadeAPIVinculo> {
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
