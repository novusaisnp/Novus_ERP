import { supabase } from '@/integrations/supabase/client';
import { Colaborador } from '@/types/rh';
import { getEmpresaAtivaId as getEmpresaId } from '@/lib/empresaAtiva';

function toDbPayload(c: Colaborador, empresaId: string | null) {
  const end = c.endereco;
  const bank = c.documentacao?.dadosBancarios;
  return {
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
    email: c.emailPessoal || null,
    email_corporativo: c.emailCorporativo || null,
    cargo_id: c.cargoId || null,
    departamento_id: c.departamentoId || null,
    setor_id: c.setorId || null,
    tipo_contrato: c.tipoContrato || null,
    regime_trabalho: c.regimeTrabalho || null,
    data_admissao: c.dataAdmissao ? c.dataAdmissao.toISOString().split('T')[0] : null,
    data_demissao: c.dataDemissao ? c.dataDemissao.toISOString().split('T')[0] : null,
    salario: c.salarioBase ?? null,
    pis: c.documentacao?.nisPis || null,
    banco: bank?.banco || null,
    agencia: bank?.agencia || null,
    conta: bank?.conta || null,
    tipo_conta: bank?.tipoConta || null,
    ativo: c.situacao ?? true,
    empresa_representada_id: empresaId,
    updated_at: new Date().toISOString(),
  };
}

export const colaboradorService = {
  async fetchColaboradores() {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar colaboradores');
      throw new Error('Não foi possível carregar os colaboradores.');
    }
    return data || [];
  },

  async createColaborador(colaboradorData: Colaborador) {
    const empresaId = await getEmpresaId();
    const payload = toDbPayload(colaboradorData, empresaId);
    if (!payload.empresa_representada_id) {
      throw new Error('Empresa representada não encontrada para o usuário.');
    }
    const { data, error } = await supabase
      .from('colaboradores')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao criar colaborador');
      throw error;
    }
    return data;
  },

  async updateColaborador(id: string, colaboradorData: Colaborador) {
    const empresaId = await getEmpresaId();
    const payload = toDbPayload(colaboradorData, empresaId);
    const { data, error } = await supabase
      .from('colaboradores')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao atualizar colaborador');
      throw error;
    }
    return data;
  },

  async deleteColaborador(id: string) {
    const { error } = await supabase
      .from('colaboradores')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id);

    if (error) {
      console.error('[RH] Erro ao excluir colaborador');
      throw new Error('Não foi possível excluir o colaborador.');
    }
  },
};
