
import { Cliente } from '@/types/cliente';
import { SupabaseCliente } from '@/services/clienteService';
import { validarCPF, validarCNPJ } from '@/services/cnpjApi';

// fetchClientes() hoje faz select('*') em `clientes`, sem embed de `setores` — então
// `setor` nunca vem preenchido na prática. O tipo abaixo documenta o formato esperado
// caso esse embed venha a ser adicionado, sem usar `any` para expressar "campo extra".
type SupabaseClienteComSetor = SupabaseCliente & {
  setor?: { id: string; nome?: string; codigo?: string; descricao?: string } | null;
};

export const clienteUtils = {
  transformSupabaseToCliente(item: SupabaseCliente): Cliente {
    const row = item as SupabaseClienteComSetor;
    return {
      id: item.id,
      nome: item.nome,
      apelido: item.apelido || '',
      emails: Array.isArray(item.emails) ? item.emails : (item.email ? [item.email] : ['']),
      telefones: Array.isArray(item.telefones) ? item.telefones : (item.telefone ? [item.telefone] : ['']),
      cpfCnpj: item.cpf_cnpj || '',
      tipo: (item.tipo as 'F' | 'J') || 'F',
      rg: item.rg || '',
      dataNascimento: item.data_nascimento || '',
      endereco: item.endereco || { pais: 'Brasil' },
      qualificacaoFiscal: item.qualificacao_fiscal || {},
      dadosPessoais: item.dados_pessoais || {
        estadoCivil: '',
        profissao: '',
        escolaridade: '',
        meiosComunicacaoPreferenciais: []
      },
      dadosEmpresa: {
        nomeFantasia: item.nome_fantasia || '',
        cnae: item.cnae || '',
        site: item.site || '',
        formaAtuacao: item.forma_atuacao || '',
        dataFundacao: item.data_fundacao || '',
        atividadePrincipal: item.atividade_principal || '',
        contatoEmpresa: item.contato_empresa || {
          nomeCompleto: '',
          departamento: '',
          cargo: ''
        }
      },
      // Setor para integração CRM
      setor: row.setor ? {
        id: row.setor.id,
        nome: row.setor.nome ?? row.setor.codigo ?? '',
        codigo: row.setor.codigo ?? row.setor.nome,
        descricao: row.setor.descricao
      } : undefined,
      setorId: item.setor_id || undefined,
      contatos: (Array.isArray(item.contatos) ? item.contatos : []) as Cliente['contatos'],
      documentos: (Array.isArray(item.documentos) ? item.documentos : []) as Cliente['documentos'],
      ativo: item.ativo !== false,
      createdAt: new Date(item.created_at),
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
    };
  },

  validateCliente(cliente: Cliente): { isValid: boolean; error?: string } {
    if (!cliente.nome.trim()) {
      return { isValid: false, error: 'Nome é obrigatório.' };
    }

    if (!cliente.tipo) {
      return { isValid: false, error: 'Tipo (PF/PJ) é obrigatório.' };
    }

    if (cliente.cpfCnpj) {
      if (cliente.tipo === 'F' && !validarCPF(cliente.cpfCnpj)) {
        return { isValid: false, error: 'CPF inválido.' };
      }
      
      if (cliente.tipo === 'J' && !validarCNPJ(cliente.cpfCnpj)) {
        return { isValid: false, error: 'CNPJ inválido.' };
      }
    }

    // Validações específicas para PJ
    if (cliente.tipo === 'J') {
      if (cliente.dadosEmpresa?.contatoEmpresa?.nomeCompleto && !cliente.dadosEmpresa.contatoEmpresa.nomeCompleto.trim()) {
        return { isValid: false, error: 'Nome do contato é obrigatório para pessoa jurídica.' };
      }

      if (cliente.dadosEmpresa?.site) {
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(cliente.dadosEmpresa.site)) {
          return { isValid: false, error: 'URL do site deve começar com http:// ou https://' };
        }
      }
    }

    // Validação de emails
    if (cliente.emails) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of cliente.emails) {
        if (email && !emailPattern.test(email)) {
          return { isValid: false, error: `Email inválido: ${email}` };
        }
      }
    }

    return { isValid: true };
  },

  getErrorMessage(error: { code?: string; message?: string }): string {
    if (error.code === '23505') {
      return 'Já existe um cliente com este CPF/CNPJ.';
    } else if (error.code === '23503') {
      return 'Dados de referência inválidos.';
    } else {
      return 'Não foi possível salvar os dados do cliente.';
    }
  }
};
