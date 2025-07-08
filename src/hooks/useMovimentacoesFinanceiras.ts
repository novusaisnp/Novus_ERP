import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  TituloFinanceiro, 
  FiltrosMovimentacao, 
  EstatisticasMovimentacao,
  PermissoesMovimentacao,
  TipoTitulo
} from '@/types/movimentacoesFinanceiras';

export const useMovimentacoesFinanceiras = (filtros: FiltrosMovimentacao) => {
  console.log('[useMovimentacoesFinanceiras] Hook iniciado com filtros:', filtros);

  // Buscar títulos das duas tabelas
  const { data: titulos = [], isLoading, error, refetch } = useQuery({
    queryKey: ['movimentacoes-financeiras', filtros],
    queryFn: async () => {
      console.log('[useMovimentacoesFinanceiras] Buscando títulos');
      
      const titulosUnificados: TituloFinanceiro[] = [];

      // Buscar contas a pagar se não filtrou apenas contas a receber
      if (filtros.tipo_titulo !== 'CONTAS_RECEBER') {
        let queryPagar = supabase
          .from('contas_pagar')
          .select(`
            *,
            fornecedor:fornecedores(id, razao_social, nome_fantasia, cpf, cnpj),
            plano_conta:plano_contas(id, codigo, nome),
            centro_custo:centros_custo(id, nome, codigo)
          `);

        // Aplicar filtros
        if (filtros.busca) {
          queryPagar = queryPagar.or(`numero_documento.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
        }
        
        if (filtros.situacao && filtros.situacao !== 'TODOS') {
          queryPagar = queryPagar.eq('situacao', filtros.situacao);
        }
        
        if (filtros.data_inicio) {
          queryPagar = queryPagar.gte('data_vencimento', filtros.data_inicio);
        }
        
        if (filtros.data_fim) {
          queryPagar = queryPagar.lte('data_vencimento', filtros.data_fim);
        }
        
        if (filtros.valor_min) {
          queryPagar = queryPagar.gte('valor_original', filtros.valor_min);
        }
        
        if (filtros.valor_max) {
          queryPagar = queryPagar.lte('valor_original', filtros.valor_max);
        }

        if (filtros.pessoa_id) {
          queryPagar = queryPagar.eq('fornecedor_id', filtros.pessoa_id);
        }

        if (filtros.centro_custo_id) {
          queryPagar = queryPagar.eq('centro_custo_id', filtros.centro_custo_id);
        }

        if (filtros.plano_conta_id) {
          queryPagar = queryPagar.eq('plano_conta_id', filtros.plano_conta_id);
        }

        if (!filtros.incluir_cancelados) {
          queryPagar = queryPagar.neq('situacao', 'CANCELADA');
        }

        const { data: contasPagar, error: errorPagar } = await queryPagar.order('data_vencimento', { ascending: false });

        if (errorPagar) {
          console.error('[useMovimentacoesFinanceiras] Erro ao buscar contas a pagar:', errorPagar);
        } else if (contasPagar) {
          contasPagar.forEach(conta => {
            const titulo: TituloFinanceiro = {
              id: conta.id,
              tipo: 'CONTAS_PAGAR',
              numero_documento: conta.numero_documento,
              descricao: conta.descricao,
              valor_original: Number(conta.valor_original),
              valor_atual: Number(conta.valor_atual),
              data_emissao: conta.data_emissao,
              data_vencimento: conta.data_vencimento,
              situacao: conta.situacao as any,
              observacoes: conta.observacoes,
              created_at: conta.created_at,
              updated_at: conta.updated_at,
              pessoa: conta.fornecedor ? {
                id: conta.fornecedor.id,
                nome: conta.fornecedor.razao_social || conta.fornecedor.nome_fantasia || 'Não informado',
                cpf_cnpj: conta.fornecedor.cnpj || conta.fornecedor.cpf,
                tipo: 'fornecedor'
              } : undefined,
              plano_conta: conta.plano_conta,
              centro_custo: conta.centro_custo
            };
            titulosUnificados.push(titulo);
          });
        }
      }

      // Buscar contas a receber se não filtrou apenas contas a pagar
      if (filtros.tipo_titulo !== 'CONTAS_PAGAR') {
        let queryReceber = supabase
          .from('contas_receber')
          .select(`
            *,
            cliente:clientes(id, nome, cpf_cnpj)
          `);

        // Aplicar filtros
        if (filtros.busca) {
          queryReceber = queryReceber.or(`numero_documento.ilike.%${filtros.busca}%`);
        }
        
        if (filtros.situacao && filtros.situacao !== 'TODOS') {
          queryReceber = queryReceber.eq('situacao', filtros.situacao);
        }
        
        if (filtros.data_inicio) {
          queryReceber = queryReceber.gte('data_vencimento', filtros.data_inicio);
        }
        
        if (filtros.data_fim) {
          queryReceber = queryReceber.lte('data_vencimento', filtros.data_fim);
        }
        
        if (filtros.valor_min) {
          queryReceber = queryReceber.gte('valor_original', filtros.valor_min);
        }
        
        if (filtros.valor_max) {
          queryReceber = queryReceber.lte('valor_original', filtros.valor_max);
        }

        if (filtros.pessoa_id) {
          queryReceber = queryReceber.eq('cliente_id', filtros.pessoa_id);
        }

        if (!filtros.incluir_cancelados) {
          queryReceber = queryReceber.neq('situacao', 'CANCELADA');
        }

        const { data: contasReceber, error: errorReceber } = await queryReceber.order('data_vencimento', { ascending: false });

        if (errorReceber) {
          console.error('[useMovimentacoesFinanceiras] Erro ao buscar contas a receber:', errorReceber);
        } else if (contasReceber) {
          contasReceber.forEach(conta => {
            const titulo: TituloFinanceiro = {
              id: conta.id,
              tipo: 'CONTAS_RECEBER',
              numero_documento: conta.numero_documento,
              valor_original: Number(conta.valor_original),
              valor_pago: conta.valor_pago ? Number(conta.valor_pago) : undefined,
              data_emissao: conta.data_emissao,
              data_vencimento: conta.data_vencimento,
              data_pagamento: conta.data_pagamento,
              situacao: conta.situacao as any,
              observacoes: conta.observacoes,
              created_at: conta.created_at,
              updated_at: conta.updated_at,
              pessoa: conta.cliente ? {
                id: conta.cliente.id,
                nome: conta.cliente.nome,
                cpf_cnpj: conta.cliente.cpf_cnpj,
                tipo: 'cliente'
              } : undefined
            };
            titulosUnificados.push(titulo);
          });
        }
      }

      // Ordenar por data de vencimento (mais recente primeiro)
      return titulosUnificados.sort((a, b) => 
        new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
      );
    },
    retry: 1,
  });

  // Calcular estatísticas
  const estatisticas = useMemo((): EstatisticasMovimentacao => {
    if (!titulos.length) {
      return {
        total_titulos: 0,
        total_abertos: 0,
        total_pagos: 0,
        total_vencidos: 0,
        total_cancelados: 0,
        valor_total_aberto: 0,
        valor_total_pago: 0,
        valor_total_vencido: 0,
      };
    }

    const stats = {
      total_titulos: titulos.length,
      total_abertos: 0,
      total_pagos: 0,
      total_vencidos: 0,
      total_cancelados: 0,
      valor_total_aberto: 0,
      valor_total_pago: 0,
      valor_total_vencido: 0,
    };

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    titulos.forEach(titulo => {
      const dataVencimento = new Date(titulo.data_vencimento);
      
      switch (titulo.situacao) {
        case 'ABERTA':
          if (dataVencimento < hoje) {
            stats.total_vencidos++;
            stats.valor_total_vencido += titulo.valor_original;
          } else {
            stats.total_abertos++;
            stats.valor_total_aberto += titulo.valor_original;
          }
          break;
        case 'PAGA':
        case 'RECEBIDA':
          stats.total_pagos++;
          stats.valor_total_pago += titulo.valor_pago || titulo.valor_original;
          break;
        case 'VENCIDA':
          stats.total_vencidos++;
          stats.valor_total_vencido += titulo.valor_original;
          break;
        case 'CANCELADA':
          stats.total_cancelados++;
          break;
      }
    });

    return stats;
  }, [titulos]);

  // Permissões (pode ser implementado com contexto de usuário)
  const permissoes: PermissoesMovimentacao = {
    pode_liquidar: true,
    pode_estornar: true,
    pode_editar: true,
    pode_cancelar: true,
    pode_visualizar_historico: true,
    pode_editar_rateio: true,
  };

  return {
    titulos,
    estatisticas,
    isLoading,
    error,
    permissoes,
    refetch
  };
};