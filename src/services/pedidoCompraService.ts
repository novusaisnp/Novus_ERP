import { supabase } from '@/integrations/supabase/client';
import type { PedidoCompra, EnviarParaAprovacaoResultado } from '@/types/pedidoCompra';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para esta operação, ou o pedido já mudou de status.');
  }
  if (msg.startsWith('COTACAO_NAO_FECHADA')) {
    return new Error('A cotação precisa estar fechada antes de gerar o pedido.');
  }
  if (msg.startsWith('PEDIDO_NAO_E_RASCUNHO')) {
    return new Error('Este pedido já foi enviado para aprovação.');
  }
  if (msg.startsWith('PEDIDO_SEM_ITENS')) {
    return new Error('O pedido não tem itens.');
  }
  if (msg.startsWith('PEDIDO_NAO_APROVADO')) {
    return new Error('O pedido precisa estar aprovado antes de ser emitido.');
  }
  if (msg.startsWith('PEDIDO_NAO_CANCELAVEL')) {
    return new Error('Este pedido não pode mais ser cancelado no estado atual.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const pedidoCompraService = {
  async list(): Promise<PedidoCompra[]> {
    const { data, error } = await supabase
      .from('pedidos_compra')
      .select('*, itens:pedidos_compra_itens(*)')
      .order('created_at', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar pedidos de compra');
    return (data || []) as unknown as PedidoCompra[];
  },

  async gerarDaCotacao(cotacaoId: string): Promise<PedidoCompra[]> {
    const { data, error } = await supabase.rpc('gerar_pedidos_compra_da_cotacao', { p_cotacao_id: cotacaoId });
    if (error) throw translateError(error, 'Erro ao gerar pedidos de compra');
    return (data || []) as unknown as PedidoCompra[];
  },

  async enviarParaAprovacao(pedidoId: string): Promise<EnviarParaAprovacaoResultado> {
    const { data, error } = await supabase.rpc('enviar_pedido_compra_para_aprovacao', { p_pedido_id: pedidoId });
    if (error) throw translateError(error, 'Erro ao enviar pedido para aprovação');
    return data as unknown as EnviarParaAprovacaoResultado;
  },

  async marcarEmitido(pedidoId: string): Promise<void> {
    const { error } = await supabase.rpc('marcar_pedido_compra_emitido', { p_pedido_id: pedidoId });
    if (error) throw translateError(error, 'Erro ao marcar pedido como emitido');
  },

  async cancelar(pedidoId: string): Promise<void> {
    const { error } = await supabase.rpc('cancelar_pedido_compra', { p_pedido_id: pedidoId });
    if (error) throw translateError(error, 'Erro ao cancelar pedido');
  },
};
