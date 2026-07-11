import { supabase as _supabase } from '@/integrations/supabase/client';
import { friendlyError } from '@/services/vendaPagamentoService';

const supabase: any = _supabase;

export interface TituloGerado {
  parcela_id: string;
  conta_receber_id: string;
  replay: boolean;
}

export interface GerarContasReceberResult {
  ok: boolean;
  venda_id: string;
  gerados: number;
  reaproveitados: number;
  titulos: TituloGerado[];
  erros: Array<{ codigo: string; mensagem: string }>;
  avisos: Array<{ codigo: string; mensagem: string }>;
}

export class ConflitoPayloadContasReceberError extends Error {
  code = 'CONFLITO_PAYLOAD_DIVERGENTE';
  constructor(msg = 'Uma ou mais parcelas já possuem título com payload diferente.') {
    super(msg);
  }
}

function traduzirCodigo(msg: string): string {
  if (/CONFLITO_PAYLOAD_DIVERGENTE/.test(msg)) return 'Parcela já possui título com payload divergente.';
  if (/VENDA_NAO_ENCONTRADA/.test(msg)) return 'Venda não encontrada.';
  if (/VENDA_NAO_ELEGIVEL/.test(msg)) return 'Venda não está em status elegível (confirmado/faturado/entregue).';
  if (/CLIENTE_OBRIGATORIO/.test(msg)) return 'A venda precisa ter um cliente vinculado.';
  if (/PERM_DENIED/.test(msg)) return 'Sem permissão para gerar títulos desta venda.';
  if (/DIVERGENCIA_TOTAL/.test(msg)) return 'Divergência entre soma de títulos e parcelas.';
  return msg;
}

export const gerarContasReceberDaVenda = async (
  vendaId: string,
  idempotencyKey?: string,
): Promise<GerarContasReceberResult> => {
  const { data, error } = await supabase.rpc('gerar_contas_receber_da_venda', {
    p_venda_id: vendaId,
    p_idempotency_key: idempotencyKey ?? null,
  });
  if (error) {
    const raw = error.message || '';
    if (/CONFLITO_PAYLOAD_DIVERGENTE/.test(raw)) {
      throw new ConflitoPayloadContasReceberError(traduzirCodigo(raw));
    }
    throw new Error(traduzirCodigo(friendlyError(error)));
  }
  return data as GerarContasReceberResult;
};
