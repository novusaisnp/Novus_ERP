import { supabase } from '@/integrations/supabase/client';
import { Colaborador } from '@/types/rh';
import { getEmpresaAtivaId as getEmpresaId } from '@/lib/empresaAtiva';

function toEntidadePayload(c: Colaborador, empresaId: string | null) {
  const end = c.endereco;
  return {
    tipo_pessoa: 'PF',
    nome: c.nomeCompleto,
    data_nascimento: c.dataNascimento ? c.dataNascimento.toISOString().split('T')[0] : null,
    cpf: c.cpf,
    rg: c.rg || null,
    cep: end?.cep || null,
    logradouro: end?.logradouro || null,
    numero: end?.numero || null,
    complemento: end?.complemento || null,
    bairro: end?.bairro || null,
    cidade: end?.cidade || null,
    estado: end?.uf || null,
    telefone: c.telefone || null,
    email: c.emailPessoal || c.emailCorporativo || null,
    banco: c.documentacao?.dadosBancarios?.banco || null,
    agencia: c.documentacao?.dadosBancarios?.agencia || null,
    conta: c.documentacao?.dadosBancarios?.conta || null,
    tipo_conta: c.documentacao?.dadosBancarios?.tipoConta || null,
    ativo: c.situacao ?? true,
    empresa_representada_id: empresaId,
    updated_at: new Date().toISOString(),
  };
}

function toDadosColaboradorPayload(c: Colaborador) {
  return {
    cargo_id: c.cargoId || null,
    departamento_id: c.departamentoId || null,
    setor_id: c.setorId || null,
    tipo_contrato: c.tipoContrato || null,
    regime_trabalho: c.regimeTrabalho || null,
    data_admissao: c.dataAdmissao ? c.dataAdmissao.toISOString().split('T')[0] : null,
    data_demissao: c.dataDemissao ? c.dataDemissao.toISOString().split('T')[0] : null,
    salario: c.salarioBase ?? null,
    pis: c.documentacao?.nisPis || null,
  };
}

// Achata entidades + entidade_dados_colaborador(1:1) num objeto compatível
// com o formato antigo de `colaboradores` que os consumidores já esperam.
function flatten(row: Record<string, unknown>) {
  const dados = Array.isArray(row.entidade_dados_colaborador)
    ? row.entidade_dados_colaborador[0]
    : row.entidade_dados_colaborador;
  const { entidade_dados_colaborador: _omit, ...entidade } = row;
  return { ...entidade, ...(dados || {}) };
}

export const colaboradorService = {
  async fetchColaboradores() {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('entidades')
      .select('*, entidade_dados_colaborador!inner(*)')
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar colaboradores');
      throw new Error('Não foi possível carregar os colaboradores.');
    }
    return (data || []).map(flatten);
  },

  async createColaborador(colaboradorData: Colaborador) {
    const empresaId = await getEmpresaId();
    const entidadePayload = toEntidadePayload(colaboradorData, empresaId);
    if (!entidadePayload.empresa_representada_id) {
      throw new Error('Empresa representada não encontrada para o usuário.');
    }
    const { data: entidade, error } = await supabase
      .from('entidades')
      .insert(entidadePayload)
      .select()
      .single();
    if (error) {
      console.error('[RH] Erro ao criar colaborador');
      throw error;
    }

    const { error: papelError } = await supabase
      .from('entidade_papeis')
      .insert({ entidade_id: entidade.id, empresa_representada_id: empresaId, papel: 'COLABORADOR' });
    if (papelError) {
      console.error('[RH] Erro ao vincular papel Colaborador');
      throw papelError;
    }

    const { data: dados, error: dadosError } = await supabase
      .from('entidade_dados_colaborador')
      .insert({ entidade_id: entidade.id, ...toDadosColaboradorPayload(colaboradorData) })
      .select()
      .single();
    if (dadosError) {
      console.error('[RH] Erro ao salvar dados de colaborador');
      throw dadosError;
    }

    return flatten({ ...entidade, entidade_dados_colaborador: dados });
  },

  async updateColaborador(id: string, colaboradorData: Colaborador) {
    const empresaId = await getEmpresaId();
    const { data: entidade, error } = await supabase
      .from('entidades')
      .update(toEntidadePayload(colaboradorData, empresaId))
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('[RH] Erro ao atualizar colaborador');
      throw error;
    }

    const { data: dados, error: dadosError } = await supabase
      .from('entidade_dados_colaborador')
      .update(toDadosColaboradorPayload(colaboradorData))
      .eq('entidade_id', id)
      .select()
      .single();
    if (dadosError) {
      console.error('[RH] Erro ao atualizar dados de colaborador');
      throw dadosError;
    }

    return flatten({ ...entidade, entidade_dados_colaborador: dados });
  },

  async deleteColaborador(id: string) {
    const { error } = await supabase
      .from('entidades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[RH] Erro ao excluir colaborador');
      throw new Error('Não foi possível excluir o colaborador.');
    }
  },
};
