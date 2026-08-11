
import { supabase } from '@/integrations/supabase/client';
import { Fornecedor } from '@/types/fornecedor';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

// Forma real de `entidades` (flat, sem jsonb) — substitui o `SupabaseFornecedor`
// antigo, que declarava dezenas de campos (cnae, anexos_pj, dados_bancarios
// jsonb...) que a tabela nunca teve.
export interface SupabaseFornecedor {
  id: string;
  tipo_pessoa?: string | null;
  nome?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  rg?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  data_fundacao?: string | null;
  data_nascimento?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: string | null;
  prazo_entrega?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Mapeia só pros campos reais de `entidades` (flat, sem jsonb) — o service
// antigo mandava dezenas de campos que a tabela `fornecedores` nunca teve
// (endereco jsonb, dados_bancarios jsonb, anexos_pj, cnae, etc.), o que
// derrubava todo INSERT/UPDATE com erro de coluna inexistente. Bate com
// fornecedores=0 linhas reais na produção — o cadastro nunca funcionou.
// Corrigido aqui (não só renomeado) porque estava quebrado de qualquer forma.
function toEntidadePayload(f: Fornecedor, empresaId: string) {
  const isPJ = (f.tipo_pessoa || 'PJ') === 'PJ';
  const prazoNumerico = f.prazo_entrega_habitual ? parseInt(f.prazo_entrega_habitual, 10) : null;
  return {
    empresa_representada_id: empresaId,
    tipo_pessoa: f.tipo_pessoa || 'PJ',
    nome: isPJ ? (f.razaoSocial || f.nomeFantasia || '') : (f.nome_completo || ''),
    razao_social: isPJ ? (f.razaoSocial || null) : null,
    nome_fantasia: isPJ ? (f.nomeFantasia || null) : null,
    cnpj: isPJ ? (f.cnpj || null) : null,
    cpf: !isPJ ? (f.cpf || null) : null,
    rg: !isPJ ? (f.rg || null) : null,
    data_fundacao: isPJ && f.data_fundacao ? f.data_fundacao.toISOString().split('T')[0] : null,
    data_nascimento: !isPJ && f.data_nascimento ? f.data_nascimento.toISOString().split('T')[0] : null,
    inscricao_estadual: f.qualificacaoFiscal?.inscricaoEstadual || null,
    inscricao_municipal: f.qualificacaoFiscal?.inscricaoMunicipal || null,
    email: f.email || null,
    telefone: f.telefone || f.telefones?.[0]?.numero || null,
    cep: f.endereco?.cep || null,
    logradouro: f.endereco?.logradouro || null,
    numero: f.endereco?.numero || null,
    complemento: f.endereco?.complemento || null,
    bairro: f.endereco?.bairro || null,
    cidade: f.endereco?.cidade || null,
    estado: f.endereco?.uf || null,
    banco: f.dados_bancarios?.banco || null,
    agencia: f.dados_bancarios?.agencia || null,
    conta: f.dados_bancarios?.conta || null,
    tipo_conta: f.dados_bancarios?.tipo_conta || null,
    prazo_entrega: Number.isFinite(prazoNumerico) ? prazoNumerico : null,
    ativo: f.ativo !== false,
    updated_at: new Date().toISOString(),
  };
}

export const fornecedorService = {
  async fetchFornecedores() {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('entidades')
      .select('*, entidade_papeis!inner(papel)')
      .eq('empresa_representada_id', empresaId)
      .eq('entidade_papeis.papel', 'FORNECEDOR')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[fornecedorService] Erro ao carregar fornecedores:', error);
      throw error;
    }
    return (data || []).map(({ entidade_papeis: _omit, ...e }) => e);
  },

  async createFornecedor(fornecedorData: Fornecedor) {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const payload = this.transformToSupabaseFormat(fornecedorData, empresaId);

    const { data, error } = await supabase.from('entidades').insert(payload).select().single();
    if (error) {
      console.error('[fornecedorService] Erro ao criar fornecedor:', error);
      throw error;
    }

    const { error: papelError } = await supabase
      .from('entidade_papeis')
      .insert({ entidade_id: data.id, empresa_representada_id: empresaId, papel: 'FORNECEDOR' });
    if (papelError) {
      console.error('[fornecedorService] Erro ao vincular papel Fornecedor:', papelError);
      throw papelError;
    }

    return data;
  },

  async updateFornecedor(id: string, fornecedorData: Fornecedor) {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const payload = this.transformToSupabaseFormat(fornecedorData, empresaId);

    const { data, error } = await supabase.from('entidades').update(payload).eq('id', id).select().single();
    if (error) {
      console.error('[fornecedorService] Erro ao atualizar fornecedor:', error);
      throw error;
    }
    return data;
  },

  async deleteFornecedor(id: string) {
    const { error } = await supabase
      .from('entidades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[fornecedorService] Erro ao excluir fornecedor:', error);
      throw error;
    }
  },

  transformToSupabaseFormat(fornecedorData: Fornecedor, empresaId: string) {
    return toEntidadePayload(fornecedorData, empresaId);
  },
};
