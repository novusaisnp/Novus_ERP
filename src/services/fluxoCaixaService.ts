import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
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

export class FluxoCaixaService {
  static async getFluxoCaixa(filtros: FluxoCaixaFiltros = {}): Promise<FluxoCaixaItem[]> {
    console.log('[FluxoCaixa] Buscando movimentações com filtros:', filtros);
    
    try {
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
          situacao,
          observacoes,
          fornecedor:fornecedores(id, razao_social),
          plano_conta:plano_contas(id, codigo, nome),
          centro_custo:centros_custo(id, nome, codigo)
        `)
        .gte('data_vencimento', filtros.data_inicio || '2024-01-01')
        .lte('data_vencimento', filtros.data_fim || '2025-12-31')
        .eq('ativo', true);

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
          situacao,
          observacoes,
          cliente:clientes(id, nome)
        `)
        .gte('data_vencimento', filtros.data_inicio || '2024-01-01')
        .lte('data_vencimento', filtros.data_fim || '2025-12-31');

      if (errorReceber) {
        console.error('[FluxoCaixa] Erro ao buscar contas a receber:', errorReceber);
        throw errorReceber;
      }

      // Buscar liquidações para determinar status realizado
      const { data: liquidacoes, error: errorLiquidacoes } = await supabase
        .from('liquidacoes_titulos')
        .select(`
          titulo_id,
          tipo_titulo,
          data_pagamento,
          valor_pago,
          conta_bancaria:contas_bancarias(id, titular, numero_conta)
        `)
        .eq('estornado', false);

      if (errorLiquidacoes) {
        console.error('[FluxoCaixa] Erro ao buscar liquidações:', errorLiquidacoes);
      }

      // Buscar liquidações múltiplas que podem ser movimentações diretas
      const { data: liquidacoesMultiplas, error: errorMultiplas } = await supabase
        .from('liquidacoes_multiplas')
        .select(`
          liquidacao_principal_id,
          valor,
          observacoes,
          conta_bancaria:contas_bancarias(id, titular, numero_conta),
          liquidacao_principal:liquidacoes_titulos(data_pagamento, forma_pagamento)
        `);

      if (errorMultiplas) {
        console.error('[FluxoCaixa] Erro ao buscar liquidações múltiplas:', errorMultiplas);
      }

      // Transformar dados unificados
      const movimentacoes: FluxoCaixaItem[] = [];

      // Processar contas a pagar (saídas)
      contasPagar?.forEach(conta => {
        const liquidacao = liquidacoes?.find(l => 
          l.titulo_id === conta.id && l.tipo_titulo === 'CONTAS_PAGAR'
        );

        movimentacoes.push({
          id: conta.id,
          data: liquidacao?.data_pagamento || conta.data_vencimento,
          tipo: 'SAIDA',
          descricao: conta.descricao,
          valor: liquidacao?.valor_pago || conta.valor_original,
          status: liquidacao ? 'REALIZADO' : 'PREVISTO',
          tipo_fluxo: 'OPERACIONAL',
          conta_bancaria: liquidacao?.conta_bancaria as any || undefined,
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
        const liquidacao = liquidacoes?.find(l => 
          l.titulo_id === conta.id && l.tipo_titulo === 'CONTAS_RECEBER'
        );

        movimentacoes.push({
          id: conta.id,
          data: liquidacao?.data_pagamento || conta.data_vencimento,
          tipo: 'ENTRADA',
          descricao: conta.cliente?.nome || 'Receita',
          valor: liquidacao?.valor_pago || conta.valor_original,
          status: liquidacao ? 'REALIZADO' : 'PREVISTO',
          tipo_fluxo: 'OPERACIONAL',
          conta_bancaria: liquidacao?.conta_bancaria as any || undefined,
          titulo_origem: {
            id: conta.id,
            tipo: 'CONTAS_RECEBER',
            numero_documento: conta.numero_documento
          },
          observacoes: conta.observacoes
        });
      });

      // Processar liquidações múltiplas como movimentações diretas
      liquidacoesMultiplas?.forEach(multipla => {
        if (multipla.liquidacao_principal?.data_pagamento) {
          const dataMovimento = multipla.liquidacao_principal.data_pagamento;
          
          // Verificar se está dentro do período filtrado
          if ((!filtros.data_inicio || dataMovimento >= filtros.data_inicio) && 
              (!filtros.data_fim || dataMovimento <= filtros.data_fim)) {
            
            movimentacoes.push({
              id: `multipla-${multipla.liquidacao_principal_id}`,
              data: dataMovimento,
              tipo: 'SAIDA', // Assumindo que são transferências/saídas
              descricao: multipla.observacoes || 'Movimentação bancária',
              valor: multipla.valor,
              status: 'REALIZADO',
              tipo_fluxo: 'OPERACIONAL',
              conta_bancaria: multipla.conta_bancaria as any,
              observacoes: multipla.observacoes
            });
          }
        }
      });

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

      console.log('[FluxoCaixa] Movimentações processadas:', movimentacoesFiltradas.length);
      return movimentacoesFiltradas;

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao buscar fluxo de caixa:', error);
      throw error;
    }
  }

  static async getResumoFluxoCaixa(filtros: FluxoCaixaFiltros = {}): Promise<FluxoCaixaResumo> {
    console.log('[FluxoCaixa] Calculando resumo com filtros:', filtros);
    
    try {
      const movimentacoes = await this.getFluxoCaixa(filtros);
      
      const hoje = new Date();
      const data7d = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
      const data14d = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000);
      const data30d = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

      const entradas = movimentacoes.filter(m => m.tipo === 'ENTRADA');
      const saidas = movimentacoes.filter(m => m.tipo === 'SAIDA');

      const totalEntradas = entradas.reduce((sum, m) => sum + m.valor, 0);
      const totalSaidas = saidas.reduce((sum, m) => sum + m.valor, 0);

      // Buscar saldos das contas bancárias ativas
      const { data: contasBancarias, error: errorContas } = await supabase
        .from('contas_bancarias')
        .select('saldo_atual, conta_cofre')
        .eq('ativo', true);

      if (errorContas) {
        console.error('[FluxoCaixa] Erro ao buscar contas bancárias:', errorContas);
      }

      // Calcular saldo bancário total (incluindo contas cofre)
      const saldoBancarioTotal = contasBancarias?.reduce((sum, conta) => sum + conta.saldo_atual, 0) || 0;

      // Calcular saldo atual (saldos bancários + movimentações realizadas)
      const entradasRealizadas = entradas.filter(m => m.status === 'REALIZADO');
      const saidasRealizadas = saidas.filter(m => m.status === 'REALIZADO');
      const saldoMovimentacoes = entradasRealizadas.reduce((sum, m) => sum + m.valor, 0) - 
                                 saidasRealizadas.reduce((sum, m) => sum + m.valor, 0);
      const saldoAtual = saldoBancarioTotal + saldoMovimentacoes;

      console.log('[FluxoCaixa] Breakdown do saldo atual:', {
        saldoBancarioTotal,
        saldoMovimentacoes,
        saldoAtual,
        contasBancarias: contasBancarias?.length || 0
      });

      // Calcular projeções
      const movimentacoes7d = movimentacoes.filter(m => new Date(m.data) <= data7d);
      const movimentacoes14d = movimentacoes.filter(m => new Date(m.data) <= data14d);
      const movimentacoes30d = movimentacoes.filter(m => new Date(m.data) <= data30d);

      const saldoProjetado7d = saldoAtual + this.calcularSaldoProjetado(movimentacoes7d);
      const saldoProjetado14d = saldoAtual + this.calcularSaldoProjetado(movimentacoes14d);
      const saldoProjetado30d = saldoAtual + this.calcularSaldoProjetado(movimentacoes30d);

      // Calcular capital de giro (simplificado)
      const capitalGiro = saldoAtual * 0.7; // 70% do saldo atual

      // Calcular runway (dias até esgotamento)
      const mediaDiariaSaidas = totalSaidas / 30; // média dos últimos 30 dias
      const runwayDias = mediaDiariaSaidas > 0 ? Math.floor(saldoAtual / mediaDiariaSaidas) : 999;

      // Saldo mínimo (10% do capital de giro)
      const saldoMinimo = capitalGiro * 0.1;

      const resumo: FluxoCaixaResumo = {
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        saldo_atual: saldoAtual,
        saldo_projetado_7d: saldoProjetado7d,
        saldo_projetado_14d: saldoProjetado14d,
        saldo_projetado_30d: saldoProjetado30d,
        capital_giro: capitalGiro,
        runway_dias: runwayDias,
        saldo_minimo: saldoMinimo
      };

      console.log('[FluxoCaixa] Resumo calculado:', resumo);
      return resumo;

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao calcular resumo:', error);
      throw error;
    }
  }

  static async getProjecaoFluxoCaixa(dias: number = 30): Promise<FluxoCaixaProjecao[]> {
    console.log('[FluxoCaixa] Calculando projeção para', dias, 'dias');
    
    try {
      const dataInicio = new Date();
      const dataFim = new Date(dataInicio.getTime() + dias * 24 * 60 * 60 * 1000);
      
      const movimentacoes = await this.getFluxoCaixa({
        data_inicio: dataInicio.toISOString().split('T')[0],
        data_fim: dataFim.toISOString().split('T')[0]
      });

      const projecoes: FluxoCaixaProjecao[] = [];
      let saldoAcumulado = 0;

      // Agrupar por data
      const movimentacoesPorData = new Map<string, FluxoCaixaItem[]>();
      movimentacoes.forEach(m => {
        const data = m.data.split('T')[0];
        if (!movimentacoesPorData.has(data)) {
          movimentacoesPorData.set(data, []);
        }
        movimentacoesPorData.get(data)!.push(m);
      });

      // Gerar projeção dia a dia
      for (let i = 0; i < dias; i++) {
        const data = new Date(dataInicio.getTime() + i * 24 * 60 * 60 * 1000);
        const dataStr = data.toISOString().split('T')[0];
        
        const movimentacoesDia = movimentacoesPorData.get(dataStr) || [];
        
        const entradasDia = movimentacoesDia
          .filter(m => m.tipo === 'ENTRADA')
          .reduce((sum, m) => sum + m.valor, 0);
        
        const saidasDia = movimentacoesDia
          .filter(m => m.tipo === 'SAIDA')
          .reduce((sum, m) => sum + m.valor, 0);

        saldoAcumulado += entradasDia - saidasDia;

        projecoes.push({
          data: dataStr,
          entradas_previstas: entradasDia,
          saidas_previstas: saidasDia,
          saldo_acumulado: saldoAcumulado,
          cenario: 'REALISTA'
        });
      }

      console.log('[FluxoCaixa] Projeção gerada para', projecoes.length, 'dias');
      return projecoes;

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao calcular projeção:', error);
      throw error;
    }
  }

  static async getEstatisticasAvancadas(filtros: FluxoCaixaFiltros = {}): Promise<FluxoCaixaEstatisticas> {
    console.log('[FluxoCaixa] Calculando estatísticas avançadas:', filtros);
    
    try {
      const movimentacoes = await this.getFluxoCaixa(filtros);
      
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

      const estatisticas: FluxoCaixaEstatisticas = {
        periodo: `${filtros.data_inicio || 'Início'} a ${filtros.data_fim || 'Fim'}`,
        total_movimentacoes: movimentacoes.length,
        maior_entrada: maiorEntrada,
        maior_saida: maiorSaida,
        media_diaria_entradas: totalEntradas / diasPeriodo,
        media_diaria_saidas: totalSaidas / diasPeriodo,
        tendencia_saldo: totalEntradas > totalSaidas ? 'CRESCENTE' : 
                        totalEntradas < totalSaidas ? 'DECRESCENTE' : 'ESTAVEL'
      };

      console.log('[FluxoCaixa] Estatísticas calculadas:', estatisticas);
      return estatisticas;

    } catch (error) {
      console.error('[FluxoCaixa] Erro ao calcular estatísticas:', error);
      throw error;
    }
  }

  private static calcularSaldoProjetado(movimentacoes: FluxoCaixaItem[]): number {
    return movimentacoes.reduce((saldo, m) => {
      return saldo + (m.tipo === 'ENTRADA' ? m.valor : -m.valor);
    }, 0);
  }
}

export default FluxoCaixaService;