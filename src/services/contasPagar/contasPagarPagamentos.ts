
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;

interface PagamentoContaPagar {
  conta_pagar_id: string;
  valor_pago: number;
  data_pagamento: string;
  observacoes?: string;
}

export const registrarPagamento = async (pagamento: PagamentoContaPagar) => {

  // Buscar a conta a pagar com seus rateios
  const { data: conta, error: contaError } = await supabase
    .from('contas_pagar')
    .select(`
      *,
      rateios_contas_pagar (
        id,
        plano_conta_id,
        centro_custo_id,
        valor,
        percentual,
        descricao
      )
    `)
    .eq('id', pagamento.conta_pagar_id)
    .eq('ativo', true)
    .single();

  if (contaError) {
    console.error('[ContasPagarPagamentos] Erro ao buscar conta:', contaError);
    throw new Error(`Erro ao buscar conta: ${contaError.message}`);
  }

  if (!conta) {
    throw new Error('Conta a pagar não encontrada');
  }

  // Verificar se o valor pago não excede o valor atual da conta
  if (pagamento.valor_pago > conta.valor_atual) {
    throw new Error('Valor pago não pode ser maior que o valor atual da conta');
  }

  // Calcular novo valor atual
  const novoValorAtual = conta.valor_atual - pagamento.valor_pago;
  const novaSituacao = novoValorAtual === 0 ? 'PAGA' : 'ABERTA';

    valorOriginal: conta.valor_atual,
    valorPago: pagamento.valor_pago,
    novoValor: novoValorAtual,
    novaSituacao,
    temRateios: conta.rateios_contas_pagar?.length > 0
  });

  // Atualizar a conta principal
  const { error: updateError } = await supabase
    .from('contas_pagar')
    .update({
      valor_atual: novoValorAtual,
      situacao: novaSituacao,
      updated_at: new Date().toISOString()
    })
    .eq('id', pagamento.conta_pagar_id);

  if (updateError) {
    console.error('[ContasPagarPagamentos] Erro ao atualizar conta:', updateError);
    throw new Error(`Erro ao atualizar conta: ${updateError.message}`);
  }

  // IMPORTANTE: Comportamento dos Rateios no Pagamento
  // Os rateios NÃO são alterados durante o pagamento
  // Eles permanecem como registro histórico da distribuição contábil original
  // Isso é fundamental para:
  // 1. Auditoria contábil
  // 2. Relatórios de análise de custos
  // 3. Histórico de como os recursos foram alocados
  
  if (conta.rateios_contas_pagar && conta.rateios_contas_pagar.length > 0) {
    
    conta.rateios_contas_pagar.forEach((rateio, index) => {
        conta: rateio.plano_conta_id,
        centroCusto: rateio.centro_custo_id,
        valor: rateio.valor,
        percentual: rateio.percentual,
        status: 'MANTIDO_PARA_AUDITORIA'
      });
    });
  }

  // Registrar histórico do pagamento (se houver tabela de histórico)
    contaId: pagamento.conta_pagar_id,
    valorPago: pagamento.valor_pago,
    valorRestante: novoValorAtual,
    situacaoFinal: novaSituacao,
    rateiosPreservados: conta.rateios_contas_pagar?.length || 0
  });

  return {
    conta_id: pagamento.conta_pagar_id,
    valor_pago: pagamento.valor_pago,
    valor_restante: novoValorAtual,
    situacao_final: novaSituacao,
    rateios_preservados: conta.rateios_contas_pagar?.length || 0
  };
};

export const consultarRateiosOrigiais = async (contaId: string) => {

  const { data: rateios, error } = await supabase
    .from('rateios_contas_pagar')
    .select(`
      *,
      plano_contas (
        id,
        codigo,
        nome
      ),
      centros_custo (
        id,
        nome,
        codigo
      )
    `)
    .eq('conta_pagar_id', contaId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ContasPagarPagamentos] Erro ao consultar rateios:', error);
    throw new Error(`Erro ao consultar rateios: ${error.message}`);
  }

  
  return rateios || [];
};
