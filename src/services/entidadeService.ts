import { supabase } from '@/integrations/supabase/client';
import type { Entidade, PapelCodigo } from '@/types/entidade';

function toEntidadeRow(e: Entidade) {
  return {
    empresa_representada_id: e.empresaRepresentadaId,
    tipo_pessoa: e.tipoPessoa,
    nome: e.nome,
    razao_social: e.razaoSocial || null,
    nome_fantasia: e.nomeFantasia || null,
    apelido: e.apelido || null,
    cpf: e.cpf || null,
    cnpj: e.cnpj || null,
    rg: e.rg || null,
    inscricao_estadual: e.inscricaoEstadual || null,
    inscricao_municipal: e.inscricaoMunicipal || null,
    qualificacao_fiscal: {
      indicador_ie: e.indicadorIe || null,
      consumidor_final: e.consumidorFinal ?? null,
    },
    data_nascimento: e.dataNascimento || null,
    data_fundacao: e.dataFundacao || null,
    email: e.email || null,
    email_secundario: e.emailSecundario || null,
    telefone: e.telefone || null,
    telefone_secundario: e.telefoneSecundario || null,
    celular: e.celular || null,
    whatsapp: e.whatsapp || null,
    website: e.website || null,
    cep: e.cep || null,
    logradouro: e.logradouro || null,
    numero: e.numero || null,
    complemento: e.complemento || null,
    bairro: e.bairro || null,
    cidade: e.cidade || null,
    estado: e.estado || null,
    banco: e.banco || null,
    agencia: e.agencia || null,
    conta: e.conta || null,
    tipo_conta: e.tipoConta || null,
    pix: e.pix || null,
    limite_credito: e.limiteCredito ?? null,
    prazo_entrega: e.prazoEntrega ?? null,
    observacoes: e.observacoes || null,
    ativo: e.ativo,
    updated_at: new Date().toISOString(),
  };
}

function toDadosColaboradorRow(e: Entidade) {
  const d = e.dadosColaborador ?? {};
  return {
    cargo_id: d.cargoId || null,
    departamento_id: d.departamentoId || null,
    setor_id: d.setorId || null,
    data_admissao: d.dataAdmissao || null,
    data_demissao: d.dataDemissao || null,
    tipo_contrato: d.tipoContrato || null,
    regime_trabalho: d.regimeTrabalho || null,
    carga_horaria: d.cargaHoraria ?? null,
    salario: d.salario ?? null,
    pis: d.pis || null,
    ctps: d.ctps || null,
    serie_ctps: d.serieCtps || null,
  };
}

function fromRow(row: Record<string, unknown>): Entidade {
  const papeis = Array.isArray(row.entidade_papeis)
    ? (row.entidade_papeis as { papel: string }[]).map((p) => p.papel as PapelCodigo)
    : [];
  const dadosRaw = Array.isArray(row.entidade_dados_colaborador)
    ? row.entidade_dados_colaborador[0]
    : row.entidade_dados_colaborador;
  const dados = dadosRaw as Record<string, unknown> | null | undefined;
  const fiscal = row.qualificacao_fiscal as Record<string, unknown> | null | undefined;

  return {
    id: row.id as string,
    empresaRepresentadaId: row.empresa_representada_id as string,
    tipoPessoa: row.tipo_pessoa as 'PF' | 'PJ',
    papeis,
    nome: row.nome as string,
    razaoSocial: row.razao_social as string | null,
    nomeFantasia: row.nome_fantasia as string | null,
    apelido: row.apelido as string | null,
    cpf: row.cpf as string | null,
    cnpj: row.cnpj as string | null,
    rg: row.rg as string | null,
    inscricaoEstadual: row.inscricao_estadual as string | null,
    inscricaoMunicipal: row.inscricao_municipal as string | null,
    indicadorIe: fiscal?.indicador_ie as Entidade['indicadorIe'],
    consumidorFinal: fiscal?.consumidor_final as boolean | null,
    dataNascimento: row.data_nascimento as string | null,
    dataFundacao: row.data_fundacao as string | null,
    email: row.email as string | null,
    emailSecundario: row.email_secundario as string | null,
    telefone: row.telefone as string | null,
    telefoneSecundario: row.telefone_secundario as string | null,
    celular: row.celular as string | null,
    whatsapp: row.whatsapp as string | null,
    website: row.website as string | null,
    cep: row.cep as string | null,
    logradouro: row.logradouro as string | null,
    numero: row.numero as string | null,
    complemento: row.complemento as string | null,
    bairro: row.bairro as string | null,
    cidade: row.cidade as string | null,
    estado: row.estado as string | null,
    banco: row.banco as string | null,
    agencia: row.agencia as string | null,
    conta: row.conta as string | null,
    tipoConta: row.tipo_conta as string | null,
    pix: row.pix as string | null,
    limiteCredito: row.limite_credito as number | null,
    prazoEntrega: row.prazo_entrega as number | null,
    observacoes: row.observacoes as string | null,
    ativo: Boolean(row.ativo),
    dadosColaborador: dados
      ? {
          cargoId: dados.cargo_id as string | null,
          departamentoId: dados.departamento_id as string | null,
          setorId: dados.setor_id as string | null,
          dataAdmissao: dados.data_admissao as string | null,
          dataDemissao: dados.data_demissao as string | null,
          tipoContrato: dados.tipo_contrato as string | null,
          regimeTrabalho: dados.regime_trabalho as string | null,
          cargaHoraria: dados.carga_horaria as number | null,
          salario: dados.salario as number | null,
          pis: dados.pis as string | null,
          ctps: dados.ctps as string | null,
          serieCtps: dados.serie_ctps as string | null,
        }
      : undefined,
  };
}

export const entidadeService = {
  async fetchEntidades(empresaId: string, papel?: PapelCodigo): Promise<Entidade[]> {
    let query = supabase
      .from('entidades')
      .select('*, entidade_papeis(papel), entidade_dados_colaborador(*)')
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('nome');

    if (papel) {
      query = supabase
        .from('entidades')
        .select('*, entidade_papeis!inner(papel), entidade_dados_colaborador(*)')
        .eq('empresa_representada_id', empresaId)
        .eq('entidade_papeis.papel', papel)
        .is('deleted_at', null)
        .order('nome');
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(fromRow);
  },

  async createEntidade(entidade: Entidade): Promise<Entidade> {
    const { data: row, error } = await supabase
      .from('entidades')
      .insert(toEntidadeRow(entidade))
      .select()
      .single();
    if (error) throw error;

    const { error: papeisError } = await supabase
      .from('entidade_papeis')
      .insert(entidade.papeis.map((papel) => ({ entidade_id: row.id, empresa_representada_id: entidade.empresaRepresentadaId, papel })));
    if (papeisError) throw papeisError;

    if (entidade.papeis.includes('COLABORADOR')) {
      const { error: dadosError } = await supabase
        .from('entidade_dados_colaborador')
        .insert({ entidade_id: row.id, ...toDadosColaboradorRow(entidade) });
      if (dadosError) throw dadosError;
    }

    return { ...entidade, id: row.id };
  },

  async updateEntidade(id: string, entidade: Entidade): Promise<Entidade> {
    const { error } = await supabase
      .from('entidades')
      .update(toEntidadeRow(entidade))
      .eq('id', id)
      .eq('empresa_representada_id', entidade.empresaRepresentadaId);
    if (error) throw error;

    // Papéis: remove os que saíram, garante os que entraram (upsert simples via delete+insert
    // do conjunto — lista de papéis é pequena, não justifica diff fino).
    const { error: delError } = await supabase.from('entidade_papeis').delete().eq('entidade_id', id);
    if (delError) throw delError;
    const { error: papeisError } = await supabase
      .from('entidade_papeis')
      .insert(entidade.papeis.map((papel) => ({ entidade_id: id, empresa_representada_id: entidade.empresaRepresentadaId, papel })));
    if (papeisError) throw papeisError;

    if (entidade.papeis.includes('COLABORADOR')) {
      const { error: upsertError } = await supabase
        .from('entidade_dados_colaborador')
        .upsert({ entidade_id: id, ...toDadosColaboradorRow(entidade) }, { onConflict: 'entidade_id' });
      if (upsertError) throw upsertError;
    } else {
      await supabase.from('entidade_dados_colaborador').delete().eq('entidade_id', id);
    }

    return { ...entidade, id };
  },

  async deleteEntidade(id: string): Promise<void> {
    const { error } = await supabase
      .from('entidades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id);
    if (error) throw error;
  },
};
