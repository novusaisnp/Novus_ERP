
import { Fornecedor } from '@/types/fornecedor';
import { SupabaseFornecedor } from '@/services/fornecedorService';
import { validarCNPJ } from '@/services/cnpjApi';

export const fornecedorUtils = {
  // `entidades` é flat (sem jsonb) — campos ricos que o antigo `fornecedores`
  // nunca teve de verdade (cnae, anexos, contato_principal, etc.) não têm
  // mais fonte de dado nenhuma e ficam com o default do tipo `Fornecedor`.
  transformSupabaseToFornecedor(item: SupabaseFornecedor): Fornecedor {
    console.log('[fornecedorUtils] Transformando item do Supabase:', item.id, item.tipo_pessoa);
    const isPF = item.tipo_pessoa === 'PF';

    return {
      id: item.id,
      tipo_pessoa: (item.tipo_pessoa as 'PJ' | 'PF') || 'PJ',

      razaoSocial: item.razao_social || '',
      nomeFantasia: item.nome_fantasia || '',
      cnpj: item.cnpj || '',
      data_fundacao: item.data_fundacao ? new Date(item.data_fundacao) : undefined,
      prazo_entrega_habitual: item.prazo_entrega != null ? String(item.prazo_entrega) : '',

      nome_completo: isPF ? (item.nome || '') : '',
      data_nascimento: item.data_nascimento ? new Date(item.data_nascimento) : undefined,
      cpf: item.cpf || '',
      rg: item.rg || '',

      email: item.email || '',
      telefone: item.telefone || '',
      telefones: item.telefone ? [{ numero: item.telefone, tipo: 'celular' }] : [],
      endereco: {
        cep: item.cep || '',
        logradouro: item.logradouro || '',
        numero: item.numero || '',
        complemento: item.complemento || '',
        bairro: item.bairro || '',
        cidade: item.cidade || '',
        uf: item.estado || '',
      },
      usar_endereco_principal_correspondencia: true,
      dados_bancarios: {
        banco: item.banco || '',
        agencia: item.agencia || '',
        conta: item.conta || '',
        tipo_conta: (item.tipo_conta as 'corrente' | 'poupanca') || 'corrente',
      },
      qualificacaoFiscal: {
        inscricaoEstadual: item.inscricao_estadual || undefined,
        inscricaoMunicipal: item.inscricao_municipal || undefined,
      },
      ativo: item.ativo !== false,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
    } as unknown as Fornecedor;
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
    const dv1 = resto < 2 ? 0 : resto;
    
    // Calcula o segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo[i]) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const dv2 = resto < 2 ? 0 : resto;
    
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

  getErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
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
