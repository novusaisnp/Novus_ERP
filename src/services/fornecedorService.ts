
import { supabase } from '@/integrations/supabase/client';
import { Fornecedor } from '@/types/fornecedor';

export interface SupabaseFornecedor {
  id: string;
  tipo_pessoa: string;
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  data_fundacao?: string;
  cnae?: string;
  capital_social?: number;
  anexos_pj?: { contrato_social?: string | null; cartao_cnpj?: string | null; logotipo?: string | null; portfolio_anexo?: string | null } | null;
  contato_principal?: { nome: string; cargo: string } | null;
  referencias_comerciais?: string;
  atividade_principal?: string;
  prazo_entrega_habitual?: string;
  responsavel_preenchimento?: { nome: string; cargo: string } | null;
  nome_completo?: string;
  data_nascimento?: string;
  cpf?: string;
  rg?: string;
  orgao_emissor_rg?: string;
  anexos_pf?: { comprovante_residencia?: string | null; copia_rg?: string | null; cartao_bancario?: string | null } | null;
  referencias_pessoais?: string;
  horario_atendimento?: string;
  email?: string;
  telefone?: string;
  telefones?: unknown;
  endereco?: unknown;
  endereco_correspondencia?: unknown;
  usar_endereco_principal_correspondencia?: boolean;
  dados_bancarios?: { banco: string; agencia: string; conta: string; tipo_conta: 'corrente' | 'poupanca'; numero_banco?: string } | null;
  qualificacao_fiscal?: unknown;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

export const fornecedorService = {
  async fetchFornecedores() {
    console.log('[fornecedorService] Buscando fornecedores...');
    
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fornecedorService] Erro ao carregar fornecedores:', error);
      throw error;
    }

    console.log('[fornecedorService] Fornecedores carregados:', data?.length || 0);
    return data || [];
  },

  async createFornecedor(fornecedorData: Fornecedor) {
    console.log('[fornecedorService] Criando fornecedor:', fornecedorData.tipo_pessoa);
    
    const dataToSave = this.transformToSupabaseFormat(fornecedorData);
    console.log('[fornecedorService] Dados para salvar:', dataToSave);

    const { data, error } = await supabase
      .from('fornecedores')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('[fornecedorService] Erro ao criar fornecedor:', error);
      throw error;
    }

    console.log('[fornecedorService] Fornecedor criado:', data.id);
    return data;
  },

  async updateFornecedor(id: string, fornecedorData: Fornecedor) {
    console.log('[fornecedorService] Atualizando fornecedor:', id, fornecedorData.tipo_pessoa);
    
    const dataToSave = this.transformToSupabaseFormat(fornecedorData);

    const { data, error } = await supabase
      .from('fornecedores')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[fornecedorService] Erro ao atualizar fornecedor:', error);
      throw error;
    }

    console.log('[fornecedorService] Fornecedor atualizado:', data.id);
    return data;
  },

  async deleteFornecedor(id: string) {
    console.log('[fornecedorService] Excluindo fornecedor:', id);
    
    const { error } = await supabase
      .from('fornecedores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[fornecedorService] Erro ao excluir fornecedor:', error);
      throw error;
    }

    console.log('[fornecedorService] Fornecedor excluído:', id);
  },

  transformToSupabaseFormat(fornecedorData: Fornecedor) {
    const baseData = {
      tipo_pessoa: fornecedorData.tipo_pessoa || 'PJ',
      email: fornecedorData.email || null,
      telefone: fornecedorData.telefone || null,
      endereco: fornecedorData.endereco || null,
      qualificacao_fiscal: fornecedorData.qualificacaoFiscal || {},
      ativo: fornecedorData.ativo !== false,
      updated_at: new Date().toISOString(),
      
      // Campos comuns expandidos
      endereco_correspondencia: fornecedorData.endereco_correspondencia || null,
      usar_endereco_principal_correspondencia: fornecedorData.usar_endereco_principal_correspondencia !== false,
      telefones: fornecedorData.telefones || [],
      dados_bancarios: fornecedorData.dados_bancarios || {}
    };

    if (fornecedorData.tipo_pessoa === 'PJ') {
      return {
        ...baseData,
        // Campos PJ obrigatórios
        razao_social: fornecedorData.razaoSocial || '',
        nome_fantasia: fornecedorData.nomeFantasia || null,
        cnpj: fornecedorData.cnpj || null,
        data_fundacao: fornecedorData.data_fundacao ? fornecedorData.data_fundacao.toISOString().split('T')[0] : null,
        cnae: fornecedorData.cnae || null,
        capital_social: fornecedorData.capital_social || null,
        anexos_pj: fornecedorData.anexos_pj || {},
        contato_principal: fornecedorData.contato_principal || {},
        referencias_comerciais: fornecedorData.referencias_comerciais || null,
        atividade_principal: fornecedorData.atividade_principal || null,
        prazo_entrega_habitual: fornecedorData.prazo_entrega_habitual || null,
        responsavel_preenchimento: fornecedorData.responsavel_preenchimento || {},
        
        // Campos PF como null
        nome_completo: null,
        data_nascimento: null,
        cpf: null,
        rg: null,
        orgao_emissor_rg: null,
        anexos_pf: {},
        referencias_pessoais: null,
        horario_atendimento: null
      };
    } else {
      // Para Pessoa Física, usar nome_completo como razao_social (campo obrigatório)
      return {
        ...baseData,
        // Para PF, razao_social é obrigatório, então usamos nome_completo
        razao_social: fornecedorData.nome_completo || '',
        nome_fantasia: null,
        cnpj: null,
        data_fundacao: null,
        cnae: null,
        capital_social: null,
        anexos_pj: {},
        contato_principal: {},
        referencias_comerciais: null,
        atividade_principal: null,
        prazo_entrega_habitual: null,
        responsavel_preenchimento: {},
        
        // Campos PF
        nome_completo: fornecedorData.nome_completo || '',
        data_nascimento: fornecedorData.data_nascimento ? fornecedorData.data_nascimento.toISOString().split('T')[0] : null,
        cpf: fornecedorData.cpf || null,
        rg: fornecedorData.rg || null,
        orgao_emissor_rg: fornecedorData.orgao_emissor_rg || null,
        anexos_pf: fornecedorData.anexos_pf || {},
        referencias_pessoais: fornecedorData.referencias_pessoais || null,
        horario_atendimento: fornecedorData.horario_atendimento || null
      };
    }
  }
};
