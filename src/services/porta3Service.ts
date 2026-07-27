// Porta 3 (docs/CONTRATOS_CANONICOS_ERP.md §6): checagem de crédito/inadimplência
// antes de uma venda a prazo, e registro de exceção autorizada.
import { supabase } from '@/integrations/supabase/client';
import type { AutorizacaoExcecaoResult, PreflightResponse } from '@/types/porta3';

function friendlyError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /permission denied|access denied|row-level security/i.test(msg)) {
    return 'Você não tem permissão para executar esta ação.';
  }
  if (code === 'P0001') return msg.replace(/^P0001:\s*/, '') || 'Regra de negócio violada.';
  return msg || 'Erro inesperado ao verificar autorização.';
}

export const porta3Service = {
  async verificarAutorizacaoVenda(
    clienteId: string,
    empresaId: string,
    valorPretendido: number
  ): Promise<PreflightResponse> {
    const { data, error } = await supabase.rpc('verificar_autorizacao_venda', {
      p_cliente_id: clienteId,
      p_empresa_id: empresaId,
      p_valor_pretendido: valorPretendido,
    });
    if (error) throw new Error(friendlyError(error));
    return data as unknown as PreflightResponse;
  },

  async autorizarExcecaoVenda(params: {
    clienteId: string;
    empresaId: string;
    bloqueioCodigo: string;
    valorPretendido: number;
    justificativa: string;
  }): Promise<AutorizacaoExcecaoResult> {
    const { data, error } = await supabase.rpc('autorizar_excecao_venda', {
      p_cliente_id: params.clienteId,
      p_empresa_id: params.empresaId,
      p_bloqueio_codigo: params.bloqueioCodigo,
      p_valor_pretendido: params.valorPretendido,
      p_justificativa: params.justificativa,
    });
    if (error) throw new Error(friendlyError(error));
    return data as unknown as AutorizacaoExcecaoResult;
  },
};
