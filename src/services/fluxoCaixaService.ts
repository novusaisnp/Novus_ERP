import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';
import {
  FluxoCaixaItem, 
  FluxoCaixaFiltros, 
  FluxoCaixaResumo, 
  FluxoCaixaProjecao,
  FluxoCaixaEstatisticas,
  TipoMovimentacao,
  StatusMovimentacao,
  TipoFluxo
} from '@/types/fluxoCaixa';

export interface FluxoCompetenciaLinha {
  ano_mes: string;
  receita_prevista: number;
  receita_realizada: number;
  despesa_prevista: number;
  despesa_realizada: number;
  saldo_competencia: number;
}

// Sem filtro de data explícito, a janela é relativa a agora (12 meses para trás e
// para frente) — não um intervalo fixo, que vence sozinho com o tempo (era
// 2024-01-01/2025-12-31, já no passado frente à data atual).
const janelaPadrao = () => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate());
  const fim = new Date(hoje.getFullYear() + 1, hoje.getMonth(), hoje.getDate());
  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0],
  };
};

export class FluxoCaixaService {
  static async getFluxoCaixa(filtros: FluxoCaixaFiltros = {}): Promise<FluxoCaixaItem[]> {

    try {
      const empresaId = await getEmpresaAtivaIdOuFalha();
      const janela = janelaPadrao();

      // Buscar contas a pagar
      const { data: contasPagar, error: errorPagar } = await supabase
        .from('contas_pagar')
        .select(`
          id,
          numero_documento,
          descricao,
          valor_original,
          data_vencimento,
          data_emissao,
          status,
          observacoes,
          fornecedor:entidades!contas_pagar_fornecedor_id_fkey(id, razao_social),
          plano_conta:plano_contas(id, codigo, nome),
          centro_custo:centros_custo(id, nome, codigo)
        `)
        .gte('data_vencimento', filtros.data_inicio || janela.inicio)
        .lte('data_vencimento', filtros.data_fim || janela.fim)
        .eq('empresa_representada_id', empresaId)
        .is('deleted_at', null);

      if (errorPagar) {
        console.error('[FluxoCaixa] Erro ao buscar contas a pagar:', errorPagar);
        throw errorPagar;
      }

      // Buscar contas a receber
      const { data: contasReceber, error: errorReceber } = await supabase
        .from('contas_receber')
        .select(`
          id,
          numero_documento,
          valor_original,
          data_vencimento,
          data_emissao,
          status,
          observacoes,
          cliente:entidades!contas_receber_cliente_id_fkey(id, nome)
        `)
        .gte('data_vencimento', filtros.data_inicio || janela.inicio)
        .lte('data_vencimento', filtros.data_fim || janela.fim)
        .eq('empresa_representada_id', empresaId)
        .is('deleted_at', null);


      if (errorReceber) {
        console.error('[FluxoCaixa] Erro ao buscar contas a receber:', errorReceber);
        throw errorReceber;
      }

      // Buscar liquidações para determinar status realizado
      // Nota: sem embed de contas_bancarias (FK ausente no schema atual)
      const { data: liquidacoes, error: errorLiquidacoes } = await supabase
        .from('liquidacoes_titulos')
        .select(`
          conta_pagar_id,
          conta_receber_id,
          data_liquidacao,
          valor_pago,
          conta_bancaria_id
        `)
        .eq('cancelada', false)
        .eq('empresa_representada_id', empresaId);

      if (errorLiquidacoes) {
        console.error('[FluxoCaixa] Erro ao buscar liquidações:', errorLiquidacoes);
      }

      // Liquidações múltiplas: schema simplificado — não usadas como movimentação direta

      // Transformar dados unificados
      const movimentacoes: FluxoCaixaItem[] = [];

      // Processar contas a pagar (saídas)
      contasPagar?.forEach(conta => {
        const liquidacao = liquidacoes?.find(l => l.conta_pagar_id === conta.id);

        movimentacoes.push({
          id: conta.id,
          data: liquidacao?.data_liquidacao || conta.data_vencimento,
          tipo: 'SAIDA',
          descricao: conta.descricao,
          valor: liquidacao?.valor_pago || conta.valor_original,
          status: liquidacao ? 'REALIZADO' : 'PREVISTO',
          tipo_fluxo: 'OPERACIONAL',
          conta_bancaria: liquidacao?.conta_bancaria_id
            ? { id: liquidacao.conta_bancaria_id }
            : undefined,
          plano_conta: conta.plano_conta,
          centro_custo: conta.centro_custo,
          titulo_origem: {
            id: conta.id,
            tipo: 'CONTAS_PAGAR',
            numero_documento: conta.numero_documento
          },
          observacoes: conta.observacoes
        });
      });

      // Processar contas a receber (entradas)
      contasReceber?.forEach(conta => {
        const liquidacao = liquidacoes?.find(l => l.conta_receber_id === conta.id);

        movimentacoes.push({
          id: conta.id,
          data: liquidacao?.data_liquidacao || conta.data_vencimento,
          tipo: 'ENTRADA',
          descricao: conta.cliente?.nome || 'Receita',
          valor: liquidacao?.valor_pago || conta.valor_original,
          status: liquidacao ? 'REALIZADO' : 'PREVISTO',
          tipo_fluxo: 'OPERACIONAL',
          conta_bancaria: liquidacao?.conta_bancaria_id
            ? { id: liquidacao.conta_bancaria_id }
            : undefined,
          titulo_origem: {
            id: conta.id,
            tipo: 'CONTAS_RECEBER',
            numero_documento: conta.numero_documento
          },
          observacoes: conta.observacoes
        });
      });

      // Liquidações múltiplas: schema atual não suporta rastreio direto; omitido.

      // Aplicar filtros
      let movimentacoesFiltradas = movimentacoes;

      if (filtros.tipo_movimento && filtros.tipo_movimento !== 'TODOS') {
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.tipo === filtros.tipo_movimento
        );
      }

      if (filtros.status && filtros.status !== 'TODOS') {
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.status === filtros.status
        );
      }

      if (filtros.tipo_fluxo && filtros.tipo_fluxo !== 'TODOS') {
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.tipo_fluxo === filtros.tipo_fluxo
        );
      }

      if (filtros.conta_bancaria_id) {
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.conta_bancaria?.id === filtros.conta_bancaria_id
        );
      }

      if (filtros.plano_conta_id) {
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.plano_conta?.id === filtros.plano_conta_id
        );
      }

      if (filtros.centro_custo_id) {
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.centro_custo?.id === filtros.centro_custo_id
        );
      }

      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        movimentacoesFiltradas = movimentacoesFiltradas.filter(m => 
          m.descricao.toLowerCase().includes(busca) ||
          m.titulo_origem?.numero_documento.toLowerCase().includes(busca) ||
          m.observacoes?.toLowerCase().includes(busca)
        );
      }

      // Ordenar por data
      movimentacoesFiltradas.sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      );

      return movimentacoesFiltradas;

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao buscar fluxo de caixa:', error);
      throw error;
    }
  }

  // AUDITORIA_NOVA Fase 5 (item 3/3): antes buscava contas_pagar/
  // contas_receber/liquidacoes_titulos inteiras (via this.getFluxoCaixa) e
  // somava em JS — 1 dos 3 re-fetches redundantes que useFluxoCaixa disparava
  // a cada carregamento de página. Agora é uma agregação real no Postgres
  // (fn_fluxo_caixa_resumo), migration 20260817110000, provada em
  // supabase/sql/fase5_fluxo_caixa_agregacao_prova.sql.
  static async getResumoFluxoCaixa(filtros: FluxoCaixaFiltros = {}): Promise<FluxoCaixaResumo> {

    try {
      const empresaId = await getEmpresaAtivaIdOuFalha();
      const janela = janelaPadrao();

      const { data, error } = await supabase.rpc('fn_fluxo_caixa_resumo', {
        p_empresa_id: empresaId,
        p_data_inicio: filtros.data_inicio || janela.inicio,
        p_data_fim: filtros.data_fim || janela.fim,
        p_tipo_movimento: filtros.tipo_movimento && filtros.tipo_movimento !== 'TODOS' ? filtros.tipo_movimento : null,
        p_status: filtros.status && filtros.status !== 'TODOS' ? filtros.status : null,
        p_tipo_fluxo: filtros.tipo_fluxo && filtros.tipo_fluxo !== 'TODOS' ? filtros.tipo_fluxo : null,
        p_conta_bancaria_id: filtros.conta_bancaria_id || null,
        p_plano_conta_id: filtros.plano_conta_id || null,
        p_centro_custo_id: filtros.centro_custo_id || null,
        p_busca: filtros.busca || null,
      });

      if (error) {
        console.error('[FluxoCaixa] Erro ao calcular resumo (RPC):', error);
        throw error;
      }

      const row = (data as unknown as Record<string, number>[])?.[0];
      if (!row) {
        throw new Error('fn_fluxo_caixa_resumo não retornou linha');
      }

      return {
        total_entradas: Number(row.total_entradas),
        total_saidas: Number(row.total_saidas),
        saldo_atual: Number(row.saldo_atual),
        saldo_projetado_7d: Number(row.saldo_projetado_7d),
        saldo_projetado_14d: Number(row.saldo_projetado_14d),
        saldo_projetado_30d: Number(row.saldo_projetado_30d),
        capital_giro: Number(row.capital_giro),
        runway_dias: Number(row.runway_dias),
        saldo_minimo: Number(row.saldo_minimo),
      };

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao calcular resumo:', error);
      throw error;
    }
  }

  // AUDITORIA_NOVA Fase 5 (item 3/3): idem getResumoFluxoCaixa — agrupamento
  // dia a dia com saldo acumulado agora vem pronto do Postgres
  // (fn_fluxo_caixa_projecao), não mais de uma busca completa + Map em JS.
  static async getProjecaoFluxoCaixa(dias: number = 30): Promise<FluxoCaixaProjecao[]> {

    try {
      const empresaId = await getEmpresaAtivaIdOuFalha();

      const { data, error } = await supabase.rpc('fn_fluxo_caixa_projecao', {
        p_empresa_id: empresaId,
        p_dias: dias,
      });

      if (error) {
        console.error('[FluxoCaixa] Erro ao calcular projeção (RPC):', error);
        throw error;
      }

      return ((data as unknown as Array<{ data: string; entradas_previstas: number; saidas_previstas: number; saldo_acumulado: number }>) ?? [])
        .map((row) => ({
          data: row.data,
          entradas_previstas: Number(row.entradas_previstas),
          saidas_previstas: Number(row.saidas_previstas),
          saldo_acumulado: Number(row.saldo_acumulado),
          cenario: 'REALISTA' as const,
        }));

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao calcular projeção:', error);
      throw error;
    }
  }

  // AUDITORIA_NOVA Fase 5 (item 3/3): antes buscava tudo de novo (3º
  // re-fetch redundante de useFluxoCaixa). "Maior entrada/saída" precisa do
  // item completo (descrição, título de origem) pra exibir na tela — não
  // compensa uma RPC só pra isso quando o array já foi buscado pela query de
  // `movimentacoes`; derivado em memória, sem chamada nova ao banco.
  static getEstatisticasAvancadas(movimentacoes: FluxoCaixaItem[], filtros: FluxoCaixaFiltros = {}): FluxoCaixaEstatisticas {
    const entradas = movimentacoes.filter(m => m.tipo === 'ENTRADA');
    const saidas = movimentacoes.filter(m => m.tipo === 'SAIDA');

    const maiorEntrada = entradas.reduce((max, m) =>
      m.valor > max.valor ? m : max, entradas[0] || {} as FluxoCaixaItem
    );

    const maiorSaida = saidas.reduce((max, m) =>
      m.valor > max.valor ? m : max, saidas[0] || {} as FluxoCaixaItem
    );

    const diasPeriodo = filtros.data_fim && filtros.data_inicio
      ? Math.ceil((new Date(filtros.data_fim).getTime() - new Date(filtros.data_inicio).getTime()) / (24 * 60 * 60 * 1000))
      : 30;

    const totalEntradas = entradas.reduce((sum, m) => sum + m.valor, 0);
    const totalSaidas = saidas.reduce((sum, m) => sum + m.valor, 0);

    return {
      periodo: `${filtros.data_inicio || 'Início'} a ${filtros.data_fim || 'Fim'}`,
      total_movimentacoes: movimentacoes.length,
      maior_entrada: maiorEntrada,
      maior_saida: maiorSaida,
      media_diaria_entradas: totalEntradas / diasPeriodo,
      media_diaria_saidas: totalSaidas / diasPeriodo,
      tendencia_saldo: totalEntradas > totalSaidas ? 'CRESCENTE' :
                      totalEntradas < totalSaidas ? 'DECRESCENTE' : 'ESTAVEL'
    };
  }

  static async getFluxoCompetencia(params: {
    dataInicio: string;
    dataFim: string;
    empresaId?: string | null;
  }): Promise<FluxoCompetenciaLinha[]> {
    const { data, error } = await supabase.rpc('relatorio_fluxo_competencia', {
      p_data_ini: params.dataInicio,
      p_data_fim: params.dataFim,
      p_empresa_id: params.empresaId ?? null,
    });
    if (error) {
      console.error('[FluxoCaixa] Erro ao buscar fluxo por competência:', error);
      throw error;
    }
    return (data as FluxoCompetenciaLinha[]) ?? [];
  }
}

export default FluxoCaixaService;