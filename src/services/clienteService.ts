
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { Cliente } from '@/types/cliente';

export interface SupabaseCliente {
  id: string;
  nome: string;
  apelido?: string | null;
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  tipo: string;
  rg?: string | null;
  data_nascimento?: string | null;
  endereco?: any;
  qualificacao_fiscal?: any;
  // Novos campos específicos para PJ
  nome_fantasia?: string | null;
  cnae?: string | null;
  site?: string | null;
  forma_atuacao?: string | null;
  data_fundacao?: string | null;
  atividade_principal?: string | null;
  contato_empresa?: any;
  contatos?: any;
  documentos?: any;
  emails?: any;
  telefones?: any;
  dados_pessoais?: any;
  // Campo setor para integração CRM
  setor_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
}

export const clienteService = {
  async fetchClientes() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar clientes:', error);
      throw new Error('Não foi possível carregar os clientes.');
    }

    return data || [];
  },

  async createCliente(clienteData: Cliente) {
    const dataToSave = {
      nome: clienteData.nome,
      apelido: clienteData.apelido || null,
      email: clienteData.emails?.[0] || null,
      telefone: clienteData.telefones?.[0] || null,
      cpf_cnpj: clienteData.cpfCnpj || null,
      tipo: clienteData.tipo,
      rg: clienteData.rg || null,
      data_nascimento: clienteData.dataNascimento || null,
      endereco: clienteData.endereco || null,
      qualificacao_fiscal: clienteData.qualificacaoFiscal || {},
      emails: clienteData.emails || [],
      telefones: clienteData.telefones || [],
      dados_pessoais: clienteData.dadosPessoais || {},
      documentos: clienteData.documentos || [],
      contatos: JSON.parse(JSON.stringify(clienteData.contatos || [])),
      // Campos específicos para PJ
      nome_fantasia: clienteData.dadosEmpresa?.nomeFantasia || null,
      cnae: clienteData.dadosEmpresa?.cnae || null,
      site: clienteData.dadosEmpresa?.site || null,
      forma_atuacao: clienteData.dadosEmpresa?.formaAtuacao || null,
      data_fundacao: clienteData.dadosEmpresa?.dataFundacao || null,
      atividade_principal: clienteData.dadosEmpresa?.atividadePrincipal || null,
      contato_empresa: clienteData.dadosEmpresa?.contatoEmpresa || null,
      // Campo setor para integração CRM
      setor_id: clienteData.setorId || null,
      ativo: clienteData.ativo !== false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('clientes')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }

    return data;
  },

  async updateCliente(id: string, clienteData: Cliente) {
    const dataToSave = {
      nome: clienteData.nome,
      apelido: clienteData.apelido || null,
      email: clienteData.emails?.[0] || null,
      telefone: clienteData.telefones?.[0] || null,
      cpf_cnpj: clienteData.cpfCnpj || null,
      tipo: clienteData.tipo,
      rg: clienteData.rg || null,
      data_nascimento: clienteData.dataNascimento || null,
      endereco: clienteData.endereco || null,
      qualificacao_fiscal: clienteData.qualificacaoFiscal || {},
      emails: clienteData.emails || [],
      telefones: clienteData.telefones || [],
      dados_pessoais: clienteData.dadosPessoais || {},
      documentos: clienteData.documentos || [],
      contatos: JSON.parse(JSON.stringify(clienteData.contatos || [])),
      // Campos específicos para PJ
      nome_fantasia: clienteData.dadosEmpresa?.nomeFantasia || null,
      cnae: clienteData.dadosEmpresa?.cnae || null,
      site: clienteData.dadosEmpresa?.site || null,
      forma_atuacao: clienteData.dadosEmpresa?.formaAtuacao || null,
      data_fundacao: clienteData.dadosEmpresa?.dataFundacao || null,
      atividade_principal: clienteData.dadosEmpresa?.atividadePrincipal || null,
      contato_empresa: clienteData.dadosEmpresa?.contatoEmpresa || null,
      // Campo setor para integração CRM
      setor_id: clienteData.setorId || null,
      ativo: clienteData.ativo !== false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('clientes')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }

    return data;
  },

  async deleteCliente(id: string) {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir cliente:', error);
      throw new Error('Não foi possível excluir o cliente.');
    }
  }
};
