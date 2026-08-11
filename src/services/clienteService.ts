// FILE NAME: clienteService.ts
// FILE CONTENT:
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Cliente } from '@/types/cliente';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

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

// `entidades` guarda tipo_pessoa ('PF'/'PJ') + cpf/cnpj separados e endereço
// flat — parseRow sintetiza o formato legado (`tipo` 'F'/'J', `cpf_cnpj`,
// `endereco` jsonb) que `clienteUtils.transformSupabaseToCliente` espera,
// pra não precisar tocar nesse util nem no FormCliente.tsx.
// qualificacao_fiscal/dados_pessoais/contato_empresa/contatos/documentos
// continuam jsonb nativo (agora em `entidades`) — passam direto.
const parseRow = (row: Record<string, unknown>): SupabaseCliente => {
  const tipoPessoa = row.tipo_pessoa as string | null;
  const cpf = row.cpf as string | null;
  const cnpj = row.cnpj as string | null;
  const endereco = {
    cep: row.cep, logradouro: row.logradouro, numero: row.numero, complemento: row.complemento,
    bairro: row.bairro, cidade: row.cidade, uf: row.estado,
  };
  return {
    id: row.id as string,
    empresa_representada_id: row.empresa_representada_id as string,
    nome: row.nome as string,
    apelido: row.apelido as string | null,
    email: row.email as string | null,
    telefone: row.telefone as string | null,
    cpf_cnpj: cpf || cnpj || null,
    tipo: tipoPessoa === 'PJ' ? 'J' : 'F',
    rg: row.rg as string | null,
    data_nascimento: row.data_nascimento as string | null,
    endereco,
    qualificacao_fiscal: row.qualificacao_fiscal as Record<string, unknown> | undefined,
    nome_fantasia: row.nome_fantasia as string | null,
    cnae: row.cnae as string | null,
    site: row.site as string | null,
    forma_atuacao: row.forma_atuacao as string | null,
    data_fundacao: row.data_fundacao as string | null,
    atividade_principal: row.atividade_principal as string | null,
    contato_empresa: row.contato_empresa as Record<string, unknown> | undefined,
    contatos: (row.contatos as unknown[]) ?? [],
    documentos: (row.documentos as unknown[]) ?? [],
    dados_pessoais: row.dados_pessoais as Record<string, unknown> | undefined,
    setor_id: row.setor_id as string | null,
    ativo: Boolean(row.ativo),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string | null,
  };
};

// `entidades` é a forma canônica única (tipo_pessoa 'PF'/'PJ', cpf/cnpj
// separados, endereço flat) — sem o par de colunas dual que `clientes` tinha
// (tipo 'F'/'J' + cpf_cnpj, endereco jsonb). O `Cliente` (tipo de domínio,
// usado pelo FormCliente.tsx) continua no formato antigo; só o mapeamento
// pra DB muda aqui.
const buildDataToSave = (clienteData: Cliente, empresaRepresentadaId: string) => {
  const cpfCnpjLimpo = (clienteData.cpfCnpj || '').replace(/\D/g, '');
  const isPJ = clienteData.tipo === 'J';
  return {
    empresa_representada_id: empresaRepresentadaId,
    tipo_pessoa: isPJ ? 'PJ' : 'PF',
    nome: clienteData.nome,
    apelido: clienteData.apelido || null,
    email: clienteData.emails?.[0] || null,
    telefone: clienteData.telefones?.[0] || null,
    cpf: !isPJ ? (cpfCnpjLimpo || null) : null,
    cnpj: isPJ ? (cpfCnpjLimpo || null) : null,
    rg: clienteData.rg || null,
    data_nascimento: clienteData.dataNascimento || null,
    cep: clienteData.endereco?.cep || null,
    logradouro: clienteData.endereco?.logradouro || null,
    numero: clienteData.endereco?.numero || null,
    complemento: clienteData.endereco?.complemento || null,
    bairro: clienteData.endereco?.bairro || null,
    cidade: clienteData.endereco?.cidade || null,
    estado: clienteData.endereco?.uf || null,
    qualificacao_fiscal: clienteData.qualificacaoFiscal ?? null,
    dados_pessoais: clienteData.dadosPessoais ?? null,
    documentos: (clienteData.documentos ?? []) as unknown as Json,
    contatos: (clienteData.contatos ?? []) as unknown as Json,
    // Campos específicos para PJ
    nome_fantasia: clienteData.dadosEmpresa?.nomeFantasia || null,
    cnae: clienteData.dadosEmpresa?.cnae || null,
    site: clienteData.dadosEmpresa?.site || null,
    forma_atuacao: clienteData.dadosEmpresa?.formaAtuacao || null,
    data_fundacao: clienteData.dadosEmpresa?.dataFundacao || null,
    atividade_principal: clienteData.dadosEmpresa?.atividadePrincipal || null,
    contato_empresa: clienteData.dadosEmpresa?.contatoEmpresa ?? null,
    // Campo setor para integração CRM
    setor_id: clienteData.setorId || null,
    ativo: clienteData.ativo !== false,
    updated_at: new Date().toISOString(),
  };
};

export const clienteService = {
  async getEmpresaIdDoCliente(clienteId: string): Promise<string | null> {
    const empresaAtivaId = await getEmpresaAtivaId();
    let q = supabase.from('entidades').select('empresa_representada_id').eq('id', clienteId);
    if (empresaAtivaId) q = q.eq('empresa_representada_id', empresaAtivaId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data?.empresa_representada_id ?? null;
  },

  async fetchClientes(empresaRepresentadaId: string): Promise<SupabaseCliente[]> {
    if (!empresaRepresentadaId) {
      console.error('Erro: empresaRepresentadaId é obrigatório para fetchClientes.');
      throw new Error('ID da empresa não fornecido.');
    }
    const { data, error } = await supabase
      .from('entidades')
      .select('*, entidade_papeis!inner(papel)')
      .eq('empresa_representada_id', empresaRepresentadaId)
      .eq('entidade_papeis.papel', 'CLIENTE')
      .is('deleted_at', null)
      .order('nome');

    if (error) {
      console.error('Erro ao carregar clientes:', error);
      throw new Error('Não foi possível carregar os clientes.');
    }

    return (data || []).map((row) => parseRow(row as unknown as Record<string, unknown>));
  },

  async createCliente(clienteData: Cliente, empresaRepresentadaId: string): Promise<SupabaseCliente> {
    const dataToSave = buildDataToSave(clienteData, empresaRepresentadaId);

    const { data, error } = await supabase
      .from('entidades')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }

    const { error: papelError } = await supabase
      .from('entidade_papeis')
      .insert({ entidade_id: data.id, empresa_representada_id: empresaRepresentadaId, papel: 'CLIENTE' });
    if (papelError) {
      console.error('Erro ao vincular papel Cliente:', papelError);
      throw papelError;
    }

    return parseRow(data as unknown as Record<string, unknown>);
  },

  async updateCliente(id: string, clienteData: Cliente, empresaRepresentadaId: string): Promise<SupabaseCliente> {
    const dataToSave = buildDataToSave(clienteData, empresaRepresentadaId);

    const { data, error } = await supabase
      .from('entidades')
      .update(dataToSave)
      .eq('id', id)
      .eq('empresa_representada_id', empresaRepresentadaId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }

    return parseRow(data as unknown as Record<string, unknown>);
  },

  async deleteCliente(id: string, empresaRepresentadaId: string) {
    if (!empresaRepresentadaId) {
      console.error('Erro: empresaRepresentadaId é obrigatório para deleteCliente.');
      throw new Error('ID da empresa não fornecido.');
    }
    const { error } = await supabase
      .from('entidades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id)
      .eq('empresa_representada_id', empresaRepresentadaId);

    if (error) {
      console.error('Erro ao excluir cliente:', error);
      throw error;
    }

    return true;
  },
};
