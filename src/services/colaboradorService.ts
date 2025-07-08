
import { supabase } from '@/integrations/supabase/client';
import { Colaborador, SupabaseColaborador } from '@/types/rh';

export const colaboradorService = {
  async fetchColaboradores() {
    console.log('[RH] Carregando colaboradores...');
    const { data, error } = await supabase
      .from('colaboradores')
      .select('*')
      .order('nome_completo');

    if (error) {
      console.error('[RH] Erro ao carregar colaboradores:', error);
      throw new Error('Não foi possível carregar os colaboradores.');
    }

    console.log('[RH] Colaboradores carregados:', data?.length || 0);
    return data || [];
  },

  async createColaborador(colaboradorData: Colaborador) {
    console.log('[RH] Criando colaborador:', colaboradorData.nomeCompleto);
    
    // Preparar dados para o Supabase de forma JSON compatível
    const enderecoData = colaboradorData.endereco ? {
      cep: colaboradorData.endereco.cep,
      logradouro: colaboradorData.endereco.logradouro,
      numero: colaboradorData.endereco.numero,
      complemento: colaboradorData.endereco.complemento || null,
      bairro: colaboradorData.endereco.bairro,
      cidade: colaboradorData.endereco.cidade,
      uf: colaboradorData.endereco.uf,
      // Campos adicionais armazenados no JSON
      emailPessoal: colaboradorData.emailPessoal || null,
      emailCorporativo: colaboradorData.emailCorporativo || null,
      tipoContrato: colaboradorData.tipoContrato || null,
      regimeTrabalho: colaboradorData.regimeTrabalho || null,
      localTrabalho: colaboradorData.localTrabalho || null,
      jornada: colaboradorData.jornada ? {
        horasDiarias: colaboradorData.jornada.horasDiarias,
        diasSemana: colaboradorData.jornada.diasSemana,
        horarioInicio: colaboradorData.jornada.horarioInicio || null,
        horarioFim: colaboradorData.jornada.horarioFim || null,
      } : null,
      adicionais: colaboradorData.adicionais || null,
      documentacao: colaboradorData.documentacao ? {
        nisPis: colaboradorData.documentacao.nisPis || null,
        dadosBancarios: colaboradorData.documentacao.dadosBancarios || null,
        contratoUrl: colaboradorData.documentacao.contratoUrl || null,
      } : null,
      pontoControle: colaboradorData.pontoControle || null,
      compliance: colaboradorData.compliance ? {
        aceiteLgpd: colaboradorData.compliance.aceiteLgpd,
        dataAceite: colaboradorData.compliance.dataAceite ? colaboradorData.compliance.dataAceite.toISOString() : null,
        consentimentoDados: colaboradorData.compliance.consentimentoDados,
      } : null,
    } : null;
    
    const dataToSave = {
      nome_completo: colaboradorData.nomeCompleto,
      data_nascimento: colaboradorData.dataNascimento.toISOString().split('T')[0],
      cpf: colaboradorData.cpf,
      rg: colaboradorData.rg || null,
      endereco: enderecoData,
      telefone: colaboradorData.telefone || null,
      email: colaboradorData.emailPessoal || null, // Campo legado, mantém compatibilidade
      cargo_id: colaboradorData.cargoId || null,
      departamento_id: colaboradorData.departamentoId || null,
      regime_contratacao: colaboradorData.regimeContratacao,
      data_admissao: colaboradorData.dataAdmissao.toISOString().split('T')[0],
      data_demissao: colaboradorData.dataDemissao?.toISOString().split('T')[0] || null,
      salario_base: colaboradorData.salarioBase || null,
      empresa_representada_id: colaboradorData.empresaRepresentadaId,
      situacao: colaboradorData.situacao,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('colaboradores')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao criar colaborador:', error);
      throw error;
    }

    console.log('[RH] Colaborador criado com sucesso');
    return data;
  },

  async updateColaborador(id: string, colaboradorData: Colaborador) {
    console.log('[RH] Atualizando colaborador:', id);
    
    // Preparar dados para o Supabase de forma JSON compatível
    const enderecoData = colaboradorData.endereco ? {
      cep: colaboradorData.endereco.cep,
      logradouro: colaboradorData.endereco.logradouro,
      numero: colaboradorData.endereco.numero,
      complemento: colaboradorData.endereco.complemento || null,
      bairro: colaboradorData.endereco.bairro,
      cidade: colaboradorData.endereco.cidade,
      uf: colaboradorData.endereco.uf,
      // Campos adicionais armazenados no JSON  
      emailPessoal: colaboradorData.emailPessoal || null,
      emailCorporativo: colaboradorData.emailCorporativo || null,
      tipoContrato: colaboradorData.tipoContrato || null,
      regimeTrabalho: colaboradorData.regimeTrabalho || null,
      localTrabalho: colaboradorData.localTrabalho || null,
      jornada: colaboradorData.jornada ? {
        horasDiarias: colaboradorData.jornada.horasDiarias,
        diasSemana: colaboradorData.jornada.diasSemana,
        horarioInicio: colaboradorData.jornada.horarioInicio || null,
        horarioFim: colaboradorData.jornada.horarioFim || null,
      } : null,
      adicionais: colaboradorData.adicionais || null,
      documentacao: colaboradorData.documentacao ? {
        nisPis: colaboradorData.documentacao.nisPis || null,
        dadosBancarios: colaboradorData.documentacao.dadosBancarios || null,
        contratoUrl: colaboradorData.documentacao.contratoUrl || null,
      } : null,
      pontoControle: colaboradorData.pontoControle || null,
      compliance: colaboradorData.compliance ? {
        aceiteLgpd: colaboradorData.compliance.aceiteLgpd,
        dataAceite: colaboradorData.compliance.dataAceite ? colaboradorData.compliance.dataAceite.toISOString() : null,
        consentimentoDados: colaboradorData.compliance.consentimentoDados,
      } : null,
    } : null;
    
    const dataToSave = {
      nome_completo: colaboradorData.nomeCompleto,
      data_nascimento: colaboradorData.dataNascimento.toISOString().split('T')[0],
      cpf: colaboradorData.cpf,
      rg: colaboradorData.rg || null,
      endereco: enderecoData,
      telefone: colaboradorData.telefone || null,
      email: colaboradorData.emailPessoal || null, // Campo legado, mantém compatibilidade
      cargo_id: colaboradorData.cargoId || null,
      departamento_id: colaboradorData.departamentoId || null,
      regime_contratacao: colaboradorData.regimeContratacao,
      data_admissao: colaboradorData.dataAdmissao.toISOString().split('T')[0],
      data_demissao: colaboradorData.dataDemissao?.toISOString().split('T')[0] || null,
      salario_base: colaboradorData.salarioBase || null,
      empresa_representada_id: colaboradorData.empresaRepresentadaId,
      situacao: colaboradorData.situacao,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('colaboradores')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao atualizar colaborador:', error);
      throw error;
    }

    console.log('[RH] Colaborador atualizado com sucesso');
    return data;
  },

  async deleteColaborador(id: string) {
    console.log('[RH] Excluindo colaborador:', id);
    
    const { error } = await supabase
      .from('colaboradores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[RH] Erro ao excluir colaborador:', error);
      throw new Error('Não foi possível excluir o colaborador.');
    }

    console.log('[RH] Colaborador excluído com sucesso');
  }
};
