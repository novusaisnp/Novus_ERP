import { Colaborador, SupabaseColaborador, Cargo, SupabaseCargo, Departamento, SupabaseDepartamento, VencimentoPadrao } from '@/types/rh';

export const rhUtils = {
  transformSupabaseToColaborador(item: SupabaseColaborador): Colaborador {
    // Extrair campos do objeto endereco se existirem
    const endereco = item.endereco as any;
    
    return {
      id: item.id,
      nomeCompleto: item.nome_completo,
      dataNascimento: new Date(item.data_nascimento),
      cpf: item.cpf,
      rg: item.rg,
      endereco: endereco?.cep ? {
        cep: endereco.cep,
        logradouro: endereco.logradouro,
        numero: endereco.numero,
        complemento: endereco.complemento,
        bairro: endereco.bairro,
        cidade: endereco.cidade,
        uf: endereco.uf,
      } : undefined,
      telefone: item.telefone,
      emailPessoal: endereco?.emailPessoal || item.email, // Fallback para campo legado
      emailCorporativo: endereco?.emailCorporativo,
      cargoId: item.cargo_id,
      departamentoId: item.departamento_id,
      regimeContratacao: item.regime_contratacao as 'CLT' | 'PJ' | 'ESTAGIO' | 'TERCEIRIZADO',
      dataAdmissao: new Date(item.data_admissao),
      dataDemissao: item.data_demissao ? new Date(item.data_demissao) : undefined,
      tipoContrato: endereco?.tipoContrato,
      regimeTrabalho: endereco?.regimeTrabalho,
      localTrabalho: endereco?.localTrabalho,
      jornada: endereco?.jornada,
      salarioBase: item.salario_base,
      adicionais: endereco?.adicionais,
      documentacao: endereco?.documentacao,
      pontoControle: endereco?.pontoControle,
      compliance: endereco?.compliance ? {
        aceiteLgpd: endereco.compliance.aceiteLgpd || false,
        dataAceite: endereco.compliance.dataAceite ? new Date(endereco.compliance.dataAceite) : undefined,
        consentimentoDados: endereco.compliance.consentimentoDados || false,
      } : {
        aceiteLgpd: false,
        consentimentoDados: false,
      },
      empresaRepresentadaId: item.empresa_representada_id,
      situacao: item.situacao,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  },

  transformSupabaseToCargo(item: SupabaseCargo): Cargo {
    console.log('[Cargos] Transformando cargo do Supabase:', item.nome);
    return {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      salarioBase: item.salario_base,
      ativo: item.ativo,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  },

  transformSupabaseToDepartamento(item: SupabaseDepartamento): Departamento {
    return {
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      empresaRepresentadaId: item.empresa_representada_id,
      ativo: item.ativo,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  },

  transformSupabaseToVencimentoPadrao: (data: any): VencimentoPadrao => ({
    id: data.id,
    codigo: data.codigo,
    descricao: data.descricao,
    tipo: data.tipo,
    valor: data.valor,
    percentual: data.percentual,
    incideInss: data.incide_inss,
    incideIrrf: data.incide_irrf,
    incideFgts: data.incide_fgts,
    ativo: data.ativo,
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  }),

  validateColaboradorData(colaboradorData: Colaborador): { isValid: boolean; error?: string } {
    if (!colaboradorData.nomeCompleto?.trim()) {
      return { isValid: false, error: 'Nome completo é obrigatório.' };
    }

    if (!colaboradorData.cpf?.trim()) {
      return { isValid: false, error: 'CPF é obrigatório.' };
    }

    if (!colaboradorData.empresaRepresentadaId) {
      return { isValid: false, error: 'Empresa representada é obrigatória.' };
    }

    if (!colaboradorData.regimeContratacao) {
      return { isValid: false, error: 'Regime de contratação é obrigatório.' };
    }

    // Validações adicionais para os novos campos
    if (colaboradorData.emailPessoal && !this.isValidEmail(colaboradorData.emailPessoal)) {
      return { isValid: false, error: 'Email pessoal inválido.' };
    }

    if (colaboradorData.emailCorporativo && !this.isValidEmail(colaboradorData.emailCorporativo)) {
      return { isValid: false, error: 'Email corporativo inválido.' };
    }

    return { isValid: true };
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  getErrorMessage(error: any): string {
    if (error.code === '23505') {
      return 'Já existe um registro com estes dados.';
    } else if (error.code === '23503') {
      return 'Referência inválida. Verifique os dados relacionados.';
    } else {
      return 'Não foi possível salvar os dados.';
    }
  },

  formatCurrency(value: number): string {
    console.log('[RH] Formatando valor:', value);
    if (!value || isNaN(value)) return 'R$ 0,00';
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
    
    console.log('[RH] Valor formatado:', formatted);
    return formatted;
  },

  parseCurrency(value: string): number {
    console.log('[RH] Parseando valor:', value);
    if (!value) return 0;
    
    // Remove todos os caracteres não numéricos, exceto vírgula e ponto
    const numericValue = value
      .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgula, ponto e hífen
      .replace(/\./g, '') // Remove pontos (separadores de milhares)
      .replace(',', '.'); // Substitui vírgula por ponto (decimal)
    
    const parsed = parseFloat(numericValue);
    const result = isNaN(parsed) ? 0 : parsed;
    
    console.log('[RH] Valor parseado:', result);
    return result;
  },

  formatCPF(cpf: string): string {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  formatPhone(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  },

  formatCEP(cep: string): string {
    if (!cep) return '';
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
};
