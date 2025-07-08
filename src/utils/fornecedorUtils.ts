
import { Fornecedor } from '@/types/fornecedor';
import { SupabaseFornecedor } from '@/services/fornecedorService';
import { validarCNPJ } from '@/services/cnpjApi';

export const fornecedorUtils = {
  transformSupabaseToFornecedor(item: any): Fornecedor {
    console.log('[fornecedorUtils] Transformando item do Supabase:', item.id, item.tipo_pessoa);
    
    return {
      id: item.id,
      tipo_pessoa: item.tipo_pessoa || 'PJ',
      
      // Campos PJ
      razaoSocial: item.razao_social || '',
      nomeFantasia: item.nome_fantasia || '',
      cnpj: item.cnpj || '',
      data_fundacao: item.data_fundacao ? new Date(item.data_fundacao) : undefined,
      cnae: item.cnae || '',
      capital_social: item.capital_social || undefined,
      anexos_pj: item.anexos_pj || {
        contrato_social: null,
        cartao_cnpj: null,
        logotipo: null,
        portfolio_anexo: null
      },
      contato_principal: item.contato_principal || { nome: '', cargo: '' },
      referencias_comerciais: item.referencias_comerciais || '',
      atividade_principal: item.atividade_principal || '',
      prazo_entrega_habitual: item.prazo_entrega_habitual || '',
      responsavel_preenchimento: item.responsavel_preenchimento || { nome: '', cargo: '' },
      
      // Campos PF
      nome_completo: item.nome_completo || '',
      data_nascimento: item.data_nascimento ? new Date(item.data_nascimento) : undefined,
      cpf: item.cpf || '',
      rg: item.rg || '',
      orgao_emissor_rg: item.orgao_emissor_rg || '',
      anexos_pf: item.anexos_pf || {
        comprovante_residencia: null,
        copia_rg: null,
        cartao_bancario: null
      },
      referencias_pessoais: item.referencias_pessoais || '',
      horario_atendimento: item.horario_atendimento || '',
      
      // Campos comuns
      email: item.email || '',
      telefone: item.telefone || '',
      telefones: Array.isArray(item.telefones) ? item.telefones : [],
      endereco: item.endereco || {},
      endereco_correspondencia: item.endereco_correspondencia || {},
      usar_endereco_principal_correspondencia: item.usar_endereco_principal_correspondencia !== false,
      dados_bancarios: item.dados_bancarios || {
        banco: '',
        agencia: '',
        conta: '',
        tipo_conta: 'corrente',
        numero_banco: ''
      },
      qualificacaoFiscal: item.qualificacao_fiscal || {},
      ativo: item.ativo !== false,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
    };
  },

  validateFornecedor(fornecedor: Fornecedor): { isValid: boolean; error?: string } {
    console.log('[fornecedorUtils] Validando fornecedor:', fornecedor.tipo_pessoa);
    
    const tipoPessoa = fornecedor.tipo_pessoa || 'PJ';
    
    if (tipoPessoa === 'PJ') {
      // Validações para Pessoa Jurídica
      if (!fornecedor.razaoSocial?.trim()) {
        return { isValid: false, error: 'Razão Social é obrigatória para Pessoa Jurídica.' };
      }
      
      if (!fornecedor.cnpj?.trim()) {
        return { isValid: false, error: 'CNPJ é obrigatório para Pessoa Jurídica.' };
      }
      
      // Validar formato do CNPJ
      const cnpjLimpo = fornecedor.cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        return { isValid: false, error: 'CNPJ deve conter 14 dígitos.' };
      }
      
      if (!validarCNPJ(cnpjLimpo)) {
        return { isValid: false, error: 'CNPJ inválido.' };
      }
      
    } else if (tipoPessoa === 'PF') {
      // Validações para Pessoa Física
      if (!fornecedor.nome_completo?.trim()) {
        return { isValid: false, error: 'Nome completo é obrigatório para Pessoa Física.' };
      }
      
      if (!fornecedor.cpf?.trim()) {
        return { isValid: false, error: 'CPF é obrigatório para Pessoa Física.' };
      }
      
      // Validar formato do CPF
      const cpfLimpo = fornecedor.cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        return { isValid: false, error: 'CPF deve conter 11 dígitos.' };
      }
      
      if (!this.validarCPF(cpfLimpo)) {
        return { isValid: false, error: 'CPF inválido.' };
      }
    }

    // Validações comuns
    if (fornecedor.email && !this.validarEmail(fornecedor.email)) {
      return { isValid: false, error: 'Email inválido.' };
    }

    return { isValid: true };
  },

  validarCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpfLimpo.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    // Calcula o primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo[i]) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let dv1 = resto < 2 ? 0 : resto;
    
    // Calcula o segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo[i]) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let dv2 = resto < 2 ? 0 : resto;
    
    // Verifica se os dígitos verificadores estão corretos
    return parseInt(cpfLimpo[9]) === dv1 && parseInt(cpfLimpo[10]) === dv2;
  },

  validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  formatarCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length <= 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  },

  formatarCPF(cpf: string): string {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length <= 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  },

  getErrorMessage(error: any): string {
    console.log('[fornecedorUtils] Processando erro:', error);
    
    if (error?.code === '23505') {
      if (error.message.includes('cnpj')) {
        return 'Já existe um fornecedor com este CNPJ.';
      }
      if (error.message.includes('cpf')) {
        return 'Já existe um fornecedor com este CPF.';
      }
      return 'Já existe um fornecedor com estes dados.';
    } else if (error?.code === '23503') {
      return 'Dados de referência inválidos.';
    } else if (error?.message) {
      return error.message;
    } else {
      return 'Não foi possível processar a operação.';
    }
  }
};
