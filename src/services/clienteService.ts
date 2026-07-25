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
  documentos?: unknown[];
  emails?: string[];
  telefones?: string[];
  dados_pessoais?: Record<string, unknown>;
  // Campo setor para integração CRM
  setor_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string | null;
}

// As colunas endereco/qualificacao_fiscal/dados_pessoais/contato_empresa/contatos/
// documentos/emails/telefones existem no banco como text (guardam JSON serializado),
// não como jsonb nativo — precisam de stringify/parse explícitos neste service.
const parseJsonField = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const stringifyJsonField = (value: unknown): string | null =>
  value === undefined || value === null ? null : JSON.stringify(value);

const parseRow = (row: Record<string, unknown>): SupabaseCliente => ({
  id: row.id as string,
  empresa_representada_id: row.empresa_representada_id as string,
  nome: row.nome as string,
  apelido: row.apelido as string | null,
  email: row.email as string | null,
  telefone: row.telefone as string | null,
  cpf_cnpj: row.cpf_cnpj as string | null,
  tipo: row.tipo as string,
  rg: row.rg as string | null,
  data_nascimento: row.data_nascimento as string | null,
  endereco: parseJsonField(row.endereco as string | null, undefined),
  qualificacao_fiscal: parseJsonField(row.qualificacao_fiscal as string | null, undefined),
  nome_fantasia: row.nome_fantasia as string | null,
  cnae: row.cnae as string | null,
  site: row.site as string | null,
  forma_atuacao: row.forma_atuacao as string | null,
  data_fundacao: row.data_fundacao as string | null,
  atividade_principal: row.atividade_principal as string | null,
  contato_empresa: parseJsonField(row.contato_empresa as string | null, undefined),
  contatos: parseJsonField(row.contatos as string | null, []),
  documentos: parseJsonField(row.documentos as string | null, []),
  emails: parseJsonField(row.emails as string | null, undefined),
  telefones: parseJsonField(row.telefones as string | null, undefined),
  dados_pessoais: parseJsonField(row.dados_pessoais as string | null, undefined),
  setor_id: row.setor_id as string | null,
  ativo: Boolean(row.ativo),
  created_at: row.created_at as string,
  updated_at: row.updated_at as string | null,
});

const buildDataToSave = (clienteData: Cliente, empresaRepresentadaId: string) => ({
  empresa_representada_id: empresaRepresentadaId,
  nome: clienteData.nome,
  apelido: clienteData.apelido || null,
  email: clienteData.emails?.[0] || null,
  telefone: clienteData.telefones?.[0] || null,
  cpf_cnpj: clienteData.cpfCnpj || null,
  tipo: clienteData.tipo,
  rg: clienteData.rg || null,
  data_nascimento: clienteData.dataNascimento || null,
  endereco: stringifyJsonField(clienteData.endereco),
  qualificacao_fiscal: stringifyJsonField(clienteData.qualificacaoFiscal),
  emails: stringifyJsonField(clienteData.emails || []),
  telefones: stringifyJsonField(clienteData.telefones || []),
  dados_pessoais: stringifyJsonField(clienteData.dadosPessoais || {}),
  documentos: stringifyJsonField(clienteData.documentos || []),
  contatos: stringifyJsonField(clienteData.contatos || []),
  // Campos específicos para PJ
  nome_fantasia: clienteData.dadosEmpresa?.nomeFantasia || null,
  cnae: clienteData.dadosEmpresa?.cnae || null,
  site: clienteData.dadosEmpresa?.site || null,
  forma_atuacao: clienteData.dadosEmpresa?.formaAtuacao || null,
  data_fundacao: clienteData.dadosEmpresa?.dataFundacao || null,
  atividade_principal: clienteData.dadosEmpresa?.atividadePrincipal || null,
  contato_empresa: stringifyJsonField(clienteData.dadosEmpresa?.contatoEmpresa || null),
  // Campo setor para integração CRM
  setor_id: clienteData.setorId || null,
  ativo: clienteData.ativo !== false,
  updated_at: new Date().toISOString(),
});

export const clienteService = {
  async getEmpresaIdDoCliente(clienteId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('clientes')
      .select('empresa_representada_id')
      .eq('id', clienteId)
      .maybeSingle();
    if (error) throw error;
    return data?.empresa_representada_id ?? null;
  },

  async fetchClientes(empresaRepresentadaId: string): Promise<SupabaseCliente[]> { // <--- PARÂMETRO ADICIONADO
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

    return (data || []).map((row) => parseRow(row as unknown as Record<string, unknown>));
  },

  async createCliente(clienteData: Cliente, empresaRepresentadaId: string): Promise<SupabaseCliente> { // <--- PARÂMETRO ADICIONADO
    const dataToSave = buildDataToSave(clienteData, empresaRepresentadaId);

    const { data, error } = await supabase
      .from('clientes')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }

    return parseRow(data as unknown as Record<string, unknown>);
  },

  async updateCliente(id: string, clienteData: Cliente, empresaRepresentadaId: string): Promise<SupabaseCliente> { // <--- PARÂMETRO ADICIONADO
    const dataToSave = buildDataToSave(clienteData, empresaRepresentadaId);

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

    return parseRow(data as unknown as Record<string, unknown>);
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
