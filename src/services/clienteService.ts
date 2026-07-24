// FILE NAME: clienteService.ts
// FILE CONTENT: 
import { supabase } from '@/integrations/supabase/client';
import { Cliente } from '@/types/cliente';

export interface SupabaseCliente {
  id: string;
  empresa_representada_id: string; // <--- ADICIONADO: ESSENCIAL para o filtro e inserção
  nome: string;
  apelido?: string | null; // Coluna já existe no DB, então mantemos
  email?: string | null;
  telefone?: string | null;
  cpf_cnpj?: string | null;
  tipo: string;
  rg?: string | null;
  data_nascimento?: string | null;
  endereco?: Record<string, unknown>;
  qualificacao_fiscal?: Record<string, unknown>;
  // Novos campos específicos para PJ
  nome_fantasia?: string | null;
  cnae?: string | null;
  site?: string | null;
  forma_atuacao?: string | null;
  data_fundacao?: string | null;
  atividade_principal?: string | null;
  contato_empresa?: Record<string, unknown>;
  contatos?: unknown[];
  documentos?: unknown[]; // <--- VERIFIQUE O TIPO DESTA COLUNA NO DB (TEXT ou JSONB para base64)
  emails?: string[];
  telefones?: string[];
  dados_pessoais?: Record<string, unknown>;
  // Campo setor para integração CRM
  setor_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
}

export const clienteService = {
  async fetchClientes(empresaRepresentadaId: string) { // <--- PARÂMETRO ADICIONADO
    if (!empresaRepresentadaId) {
      console.error('Erro: empresaRepresentadaId é obrigatório para fetchClientes.');
      throw new Error('ID da empresa não fornecido.');
    }
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_representada_id', empresaRepresentadaId) // <--- FILTRANDO POR EMPRESA
      .order('nome');

    if (error) {
      console.error('Erro ao carregar clientes:', error);
      throw new Error('Não foi possível carregar os clientes.');
    }

    return data || [];
  },

  async createCliente(clienteData: Cliente, empresaRepresentadaId: string) { // <--- PARÂMETRO ADICIONADO
    const dataToSave = {
      empresa_representada_id: empresaRepresentadaId, // <--- ADICIONADO: ESSENCIAL
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
      documentos: clienteData.documentos || [], // <--- VERIFIQUE O TIPO DA COLUNA NO DB
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

  async updateCliente(id: string, clienteData: Cliente, empresaRepresentadaId: string) { // <--- PARÂMETRO ADICIONADO
    const dataToSave = {
      empresa_representada_id: empresaRepresentadaId, // <--- ADICIONADO: ESSENCIAL
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
      documentos: clienteData.documentos || [], // <--- VERIFIQUE O TIPO DA COLUNA NO DB
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
      .eq('empresa_representada_id', empresaRepresentadaId) // <--- FILTRANDO POR EMPRESA NO UPDATE
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }

    return data;
  },

  async deleteCliente(id: string, empresaRepresentadaId: string) { // <--- PARÂMETRO ADICIONADO
    if (!empresaRepresentadaId) {
      console.error('Erro: empresaRepresentadaId é obrigatório para deleteCliente.');
      throw new Error('ID da empresa não fornecido.');
    }
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('empresa_representada_id', empresaRepresentadaId); // <--- FILTRANDO POR EMPRESA NO DELETE

    if (error) {
      console.error('Erro ao excluir cliente:', error);
      throw error;
    }

    return true;
  },
};