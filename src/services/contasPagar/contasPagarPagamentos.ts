
import { supabase } from '@/integrations/supabase/client';
import { uiStatusPagarToDb } from '@/lib/statusMappers';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

interface PagamentoContaPagar {
  conta_pagar_id: string;
  valor_pago: number;
  data_pagamento: string;
  observacoes?: string;
}

export const registrarPagamento = async (pagamento: PagamentoContaPagar) => {
  const empresaId = await getEmpresaAtivaIdOuFalha();

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
        percentual
      )
    `)
    .eq('id', pagamento.conta_pagar_id)
    .eq('empresa_representada_id', empresaId)
    .is('deleted_at', null)
    .single();

  if (contaError) {
    console.error('[ContasPagarPagamentos] Erro ao buscar conta:', contaError);
    throw new Error(`Erro ao buscar conta: ${contaError.message}`);
  }

  if (!conta) {
    throw new Error('Conta a pagar não encontrada');
  }

  const valorOriginal = Number(conta.valor_original) || 0;
  const jaPago = Number(conta.valor_pago) || 0;
  const valorRestante = Math.max(valorOriginal - jaPago, 0);

  if (pagamento.valor_pago > valorRestante) {
    throw new Error('Valor pago não pode ser maior que o valor restante da conta');
  }

  const novoValorPago = jaPago + pagamento.valor_pago;
  const novoRestante = Math.max(valorOriginal - novoValorPago, 0);
  const novaSituacaoUi = novoRestante === 0 ? 'PAGA' : 'ABERTA';
  const novoStatusDb = uiStatusPagarToDb(novaSituacaoUi);

  // Atualizar a conta principal
  const { error: updateError } = await supabase
    .from('contas_pagar')
    .update({
      valor_pago: novoValorPago,
      status: novoStatusDb,
      data_pagamento: novoRestante === 0 ? pagamento.data_pagamento : null,
    })
    .eq('id', pagamento.conta_pagar_id)
    .eq('empresa_representada_id', empresaId);

  if (updateError) {
    console.error('[ContasPagarPagamentos] Erro ao atualizar conta:', updateError);
    throw new Error(`Erro ao atualizar conta: ${updateError.message}`);
  }

  // Rateios preservados como registro histórico

  return {
    conta_id: pagamento.conta_pagar_id,
    valor_pago: pagamento.valor_pago,
    valor_restante: novoRestante,
    situacao_final: novaSituacaoUi,
    rateios_preservados: conta.rateios_contas_pagar?.length || 0
  };
};


export const consultarRateiosOrigiais = async (contaId: string) => {
  const empresaId = await getEmpresaAtivaIdOuFalha();

  const { data: rateios, error } = await supabase
    .from('rateios_contas_pagar')
    .select(`
      *,
      plano_contas (
          id,
          codigo,
          nome,
          tipo
        ),
      centros_custo (
        id,
        nome,
        codigo
      )
    `)
    .eq('conta_pagar_id', contaId)
    .eq('empresa_representada_id', empresaId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ContasPagarPagamentos] Erro ao consultar rateios:', error);
    throw new Error(`Erro ao consultar rateios: ${error.message}`);
  }

  
  return rateios || [];
};
