import { supabase } from '@/integrations/supabase/client';
import type { BalancoContaLinha, DreContaLinha, TipoContaContabil, NaturezaContaContabil } from '@/types/relatoriosContabeis';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para consultar o razão contábil desta empresa.');
  }
  if (msg.startsWith('PERIODO_INVALIDO')) {
    return new Error('A data inicial não pode ser depois da data final.');
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
};
