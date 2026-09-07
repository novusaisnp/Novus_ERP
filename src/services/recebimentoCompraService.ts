import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  RecebimentoCompra,
  ConfirmarRecebimentoItemInput,
  ConfirmarRecebimentoResultado,
} from '@/types/recebimentoCompra';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para esta operação, ou o pedido já mudou de status.');
  }
  if (msg.startsWith('PEDIDO_NAO_ENCONTRADO')) {
    return new Error('Pedido de compra não encontrado.');
  }
  if (msg.startsWith('PEDIDO_NAO_EMITIDO')) {
    return new Error('Só é possível confirmar recebimento de um pedido emitido.');
  }
  if (msg.startsWith('RECEBIMENTO_SEM_ITENS')) {
    return new Error('Informe ao menos um item recebido.');
  }
  if (msg.startsWith('ITEM_NAO_PERTENCE_AO_PEDIDO')) {
    return new Error('Um dos itens informados não pertence a este pedido.');
  }
  if (msg.startsWith('QUANTIDADE_INVALIDA')) {
    return new Error('A quantidade recebida precisa ser maior que zero.');
  }
  if (msg.startsWith('QUANTIDADE_EXCEDE_PEDIDO')) {
    return new Error('A quantidade recebida ultrapassa o que falta receber neste item.');
  }
  if (msg.startsWith('LOCALIZACAO_OBRIGATORIA')) {
    return new Error('Selecione a localização de destino para cada item recebido.');
  }
  if (msg.startsWith('LOCALIZACAO_INVALIDA')) {
    return new Error('A localização selecionada não pertence a esta empresa.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const recebimentoCompraService = {
  async listByPedido(pedidoId: string): Promise<RecebimentoCompra[]> {
    const { data, error } = await supabase
      .from('recebimentos_compra')
      .select('*, itens:recebimentos_compra_itens(*)')
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar recebimentos');
    return (data || []) as unknown as RecebimentoCompra[];
  },

  async confirmar(
    pedidoId: string,
    itens: ConfirmarRecebimentoItemInput[],
    observacoes?: string
  ): Promise<ConfirmarRecebimentoResultado> {
    const { data, error } = await supabase.rpc('confirmar_recebimento_compra', {
      p_pedido_id: pedidoId,
      p_itens: itens as unknown as Json,
      p_observacoes: observacoes ?? null,
    });
    if (error) throw translateError(error, 'Erro ao confirmar recebimento');
    return data as unknown as ConfirmarRecebimentoResultado;
  },
};
