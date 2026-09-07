import { supabase } from '@/integrations/supabase/client';
import type { BalancoContaLinha, DreContaLinha, DmplContaLinha, DfcResultado, TipoContaContabil, NaturezaContaContabil } from '@/types/relatoriosContabeis';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para consultar o razão contábil desta empresa.');
  }
  if (msg.startsWith('PERIODO_INVALIDO')) {
    return new Error('A data inicial não pode ser depois da data final.');
  }
  if (msg.startsWith('CONTAS_PADRAO_NAO_CONFIGURADAS')) {
    return new Error('A empresa não tem as contas contábeis padrão configuradas (caixa, contas a receber, contas a pagar, imobilizado, depreciação) — configure em Configurações Básicas antes de gerar a DFC.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

interface RpcContaRow {
  conta_id: string | null;
  codigo: string;
  nome: string;
  tipo: string;
  natureza: string;
  nivel: number;
  conta_pai_id: string | null;
  aceita_lancamento: boolean;
}

export const relatorioContabilService = {
  async contaDepreciacaoDefault(empresaId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('empresas_representadas')
      .select('plano_conta_despesa_depreciacao_default_id')
      .eq('id', empresaId)
      .maybeSingle();
    if (error) throw translateError(error, 'Erro ao buscar a conta de depreciação padrão');
    return data?.plano_conta_despesa_depreciacao_default_id ?? null;
  },


  async balancoPatrimonial(empresaId: string, dataCorte: string): Promise<BalancoContaLinha[]> {
    const { data, error } = await supabase.rpc('relatorio_balanco_patrimonial', {
      p_empresa_id: empresaId,
      p_data_corte: dataCorte,
    });
    if (error) throw translateError(error, 'Erro ao gerar o Balanço Patrimonial');
    return ((data ?? []) as unknown as (RpcContaRow & { saldo: number })[]).map((r) => ({
      contaId: r.conta_id,
      codigo: r.codigo,
      nome: r.nome,
      tipo: r.tipo as TipoContaContabil,
      natureza: r.natureza as NaturezaContaContabil,
      nivel: r.nivel,
      contaPaiId: r.conta_pai_id,
      aceitaLancamento: r.aceita_lancamento,
      saldo: Number(r.saldo),
    }));
  },

  async dre(empresaId: string, dataInicio: string, dataFim: string): Promise<DreContaLinha[]> {
    const { data, error } = await supabase.rpc('relatorio_dre', {
      p_empresa_id: empresaId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });
    if (error) throw translateError(error, 'Erro ao gerar a DRE');
    return ((data ?? []) as unknown as (RpcContaRow & { valor_periodo: number })[]).map((r) => ({
      contaId: r.conta_id,
      codigo: r.codigo,
      nome: r.nome,
      tipo: r.tipo as TipoContaContabil,
      natureza: r.natureza as NaturezaContaContabil,
      nivel: r.nivel,
      contaPaiId: r.conta_pai_id,
      aceitaLancamento: r.aceita_lancamento,
      valorPeriodo: Number(r.valor_periodo),
    }));
  },

  async dmpl(empresaId: string, dataInicio: string, dataFim: string): Promise<DmplContaLinha[]> {
    const { data, error } = await supabase.rpc('relatorio_dmpl', {
      p_empresa_id: empresaId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });
    if (error) throw translateError(error, 'Erro ao gerar a DMPL');
    return ((data ?? []) as unknown as (RpcContaRow & { saldo_inicial: number; movimento_periodo: number; saldo_final: number })[]).map((r) => ({
      contaId: r.conta_id,
      codigo: r.codigo,
      nome: r.nome,
      tipo: r.tipo as TipoContaContabil,
      natureza: r.natureza as NaturezaContaContabil,
      nivel: r.nivel,
      contaPaiId: r.conta_pai_id,
      aceitaLancamento: r.aceita_lancamento,
      saldoInicial: Number(r.saldo_inicial),
      movimentoPeriodo: Number(r.movimento_periodo),
      saldoFinal: Number(r.saldo_final),
    }));
  },

  async dfc(empresaId: string, dataInicio: string, dataFim: string): Promise<DfcResultado> {
    const { data, error } = await supabase.rpc('relatorio_dfc_indireto', {
      p_empresa_id: empresaId,
      p_data_inicio: dataInicio,
      p_data_fim: dataFim,
    });
    if (error) throw translateError(error, 'Erro ao gerar a DFC');
    const row = (data ?? [])[0] as unknown as {
      resultado_periodo: number; depreciacao_amortizacao: number;
      variacao_contas_receber: number; variacao_contas_pagar: number; fluxo_operacional: number;
      variacao_imobilizado: number; fluxo_investimento: number;
      variacao_patrimonio_liquido: number; fluxo_financiamento: number;
      saldo_caixa_inicial: number; saldo_caixa_final: number;
      variacao_caixa_balanco: number; variacao_caixa_dfc: number;
    } | undefined;
    if (!row) throw new Error('A DFC não retornou dados para o período informado.');
    return {
      resultadoPeriodo: Number(row.resultado_periodo),
      depreciacaoAmortizacao: Number(row.depreciacao_amortizacao),
      variacaoContasReceber: Number(row.variacao_contas_receber),
      variacaoContasPagar: Number(row.variacao_contas_pagar),
      fluxoOperacional: Number(row.fluxo_operacional),
      variacaoImobilizado: Number(row.variacao_imobilizado),
      fluxoInvestimento: Number(row.fluxo_investimento),
      variacaoPatrimonioLiquido: Number(row.variacao_patrimonio_liquido),
      fluxoFinanciamento: Number(row.fluxo_financiamento),
      saldoCaixaInicial: Number(row.saldo_caixa_inicial),
      saldoCaixaFinal: Number(row.saldo_caixa_final),
      variacaoCaixaBalanco: Number(row.variacao_caixa_balanco),
      variacaoCaixaDfc: Number(row.variacao_caixa_dfc),
    };
  },
};
