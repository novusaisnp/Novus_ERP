import { Colaborador, Cargo, SupabaseCargo, Departamento, SupabaseDepartamento, VencimentoPadrao } from '@/types/rh';

// `SupabaseColaborador` (types/rh.ts) usa nomes de coluna diferentes dos lidos abaixo
// (nome_completo/regime_contratacao/situacao vs. os reais nome/tipo_contrato/ativo etc.
// usados aqui) -- gap de tipos pré-existente, não corrigido aqui (fora do escopo desta
// limpeza de lint). Este tipo documenta o formato que a função realmente lê.
interface ColaboradorSupabaseRow {
  id: string;
  nome?: string;
  data_nascimento?: string;
  cpf?: string;
  rg?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  email_corporativo?: string;
  cargo_id?: string;
  departamento_id?: string;
  tipo_contrato?: string;
  data_admissao?: string;
  data_demissao?: string;
  regime_trabalho?: string;
  salario?: number;
  pis?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo_conta?: string;
  empresa_representada_id?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const rhUtils = {
  transformSupabaseToColaborador(item: ColaboradorSupabaseRow): Colaborador {
    const hasEndereco = !!(item.cep || item.logradouro || item.bairro || item.cidade);
    return {
      id: item.id,
      nomeCompleto: item.nome ?? '',
      dataNascimento: item.data_nascimento ? new Date(item.data_nascimento) : new Date(),
      cpf: item.cpf ?? '',
      rg: item.rg ?? undefined,
      endereco: hasEndereco ? {
        cep: item.cep ?? '',
        logradouro: item.logradouro ?? '',
        numero: item.numero ?? '',
        complemento: item.complemento ?? undefined,
        bairro: item.bairro ?? '',
        cidade: item.cidade ?? '',
        uf: item.estado ?? '',
      } : undefined,
      telefone: item.telefone ?? undefined,
      emailPessoal: item.email ?? undefined,
      emailCorporativo: item.email_corporativo ?? undefined,
      cargoId: item.cargo_id ?? undefined,
      departamentoId: item.departamento_id ?? undefined,
      regimeContratacao: (item.tipo_contrato as Colaborador['regimeContratacao']) || 'CLT',
      dataAdmissao: item.data_admissao ? new Date(item.data_admissao) : new Date(),
      dataDemissao: item.data_demissao ? new Date(item.data_demissao) : undefined,
      tipoContrato: (item.tipo_contrato as Colaborador['tipoContrato']) ?? undefined,
      regimeTrabalho: (item.regime_trabalho as Colaborador['regimeTrabalho']) ?? undefined,
      salarioBase: item.salario ?? undefined,
      documentacao: {
        nisPis: item.pis ?? undefined,
        dadosBancarios: item.banco ? {
          banco: item.banco,
          agencia: item.agencia ?? '',
          conta: item.conta ?? '',
          tipoConta: (item.tipo_conta as 'CORRENTE' | 'POUPANCA') || 'CORRENTE',
        } : undefined,
      },
      compliance: {
        aceiteLgpd: false,
        consentimentoDados: false,
      },
      empresaRepresentadaId: item.empresa_representada_id,
      situacao: item.ativo ?? true,
      createdAt: item.created_at ? new Date(item.created_at) : undefined,
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
    };
  },

  transformSupabaseToCargo(item: SupabaseCargo): Cargo {
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
      responsavelId: item.responsavel_id ?? undefined,
      ativo: item.ativo,
      createdAt: item.created_at ? new Date(item.created_at) : undefined,
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
    };
  },

  transformSupabaseToVencimentoPadrao: (data: {
    id?: string;
    codigo?: string;
    descricao?: string;
    tipo?: string;
    valor?: number;
    percentual?: number;
    incide_inss?: boolean;
    incide_irrf?: boolean;
    incide_fgts?: boolean;
    ativo?: boolean;
    created_at?: string;
    updated_at?: string;
  }): VencimentoPadrao => ({
    id: data.id,
    codigo: data.codigo ?? '',
    descricao: data.descricao ?? '',
    tipo: (data.tipo as VencimentoPadrao['tipo']) ?? 'FIXO',
    valor: data.valor,
    percentual: data.percentual,
    incideInss: data.incide_inss ?? false,
    incideIrrf: data.incide_irrf ?? false,
    incideFgts: data.incide_fgts ?? false,
    ativo: data.ativo ?? true,
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

    // empresaRepresentadaId é resolvido no servidor via get_user_empresa_id()


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

  getErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
    if (error?.message?.includes('Empresa representada não encontrada')) {
      return 'Seu usuário não está vinculado a uma empresa. Solicite ao administrador o vínculo em Configurações → Usuários.';
    }
    if (error?.code === '42501') {
      return 'Sem permissão para gravar (RLS). Verifique se o usuário está vinculado à empresa correta.';
    }
    if (error?.code === '23505') {
      return 'Já existe um registro com estes dados.';
    }
    if (error?.code === '23503') {
      return 'Referência inválida. Verifique os dados relacionados.';
    }
    if (error?.code === '22P02') {
      return 'Formato de dado inválido (UUID/número).';
    }
    return error?.message || 'Não foi possível salvar os dados.';
  },

  formatCurrency(value: number): string {
    if (!value || isNaN(value)) return 'R$ 0,00';
    
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
    
    return formatted;
  },

  parseCurrency(value: string): number {
    if (!value) return 0;
    
    // Remove todos os caracteres não numéricos, exceto vírgula e ponto
    const numericValue = value
      .replace(/[^\d,.-]/g, '') // Remove tudo exceto números, vírgula, ponto e hífen
      .replace(/\./g, '') // Remove pontos (separadores de milhares)
      .replace(',', '.'); // Substitui vírgula por ponto (decimal)
    
    const parsed = parseFloat(numericValue);
    const result = isNaN(parsed) ? 0 : parsed;
    
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
