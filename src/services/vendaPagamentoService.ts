// FIN-E3: serviço da camada de pagamento da venda
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  VendaPagamento,
  VendaPagamentoInput,
  VendaPagamentoParcela,
  ValidacaoPagamentoResult,
} from '@/types/vendaPagamento';
import { gerarParcelas, hashPayload, type ParcelamentoInput } from '@/utils/parcelamento';


export function friendlyError(error: any): string {
  const code = error?.code || error?.details?.code;
  const msg = error?.message || '';
  if (code === '42501' || /permission denied|row-level security/i.test(msg))
    return 'Você não tem permissão para executar esta ação.';
  if (code === '23505') return 'Registro duplicado (idempotência).';
  if (code === '23503') return 'Referência inválida (venda/modalidade/plano).';
  if (code === '23514') return 'Valor inválido (violação de CHECK).';
  if (code === 'P0001') return msg || 'Regra de negócio violada.';
  return msg || 'Erro inesperado no pagamento da venda.';
}

export class ConflictPayloadError extends Error {
  code = 'CONFLICT_PAYLOAD';
  constructor(msg = 'Payload divergente para mesmo externo_id') { super(msg); }
}

interface UpsertPagamentoOpts {
  parcelamento: Omit<ParcelamentoInput, 'valorLiquido'>;
}

export const vendaPagamentoService = {
  async listByVenda(vendaId: string): Promise<VendaPagamento[]> {
    const { data, error } = await supabase
      .from('venda_pagamento')
      .select('*')
      .eq('venda_id', vendaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw new Error(friendlyError(error));
    return (data as VendaPagamento[]) ?? [];
  },

  async listParcelas(vendaPagamentoId: string): Promise<VendaPagamentoParcela[]> {
    const { data, error } = await supabase
      .from('venda_pagamento_parcelas')
      .select('*')
      .eq('venda_pagamento_id', vendaPagamentoId)
      .order('numero', { ascending: true });
    if (error) throw new Error(friendlyError(error));
    return (data as VendaPagamentoParcela[]) ?? [];
  },

  /**
   * Cria (ou reaproveita) uma linha de pagamento e regenera parcelas.
   * Replay-safe: se (origem_sistema, externo_id) existir com mesmo hash → retorna existente.
   * Hash divergente → ConflictPayloadError.
   */
  async criarPagamentoComParcelas(
    input: VendaPagamentoInput,
    opts: UpsertPagamentoOpts,
  ): Promise<{ pagamento: VendaPagamento; parcelas: VendaPagamentoParcela[]; replay: boolean }> {
    const valor_bruto = Number(input.valor_bruto || 0);
    const valor_desconto = Number(input.valor_desconto || 0);
    const valor_juros = Number(input.valor_juros || 0);
    const valor_liquido = Number((valor_bruto - valor_desconto + valor_juros).toFixed(2));

    const parcelasCalc = gerarParcelas({ ...opts.parcelamento, valorLiquido: valor_liquido });

    const payloadCanonico = {
      venda_id: input.venda_id,
      modalidade_id: input.modalidade_id,
      plano_pagamento_id: input.plano_pagamento_id ?? null,
      natureza_id: input.natureza_id ?? null,
      valor_liquido,
      qtd_parcelas: input.qtd_parcelas,
      parcelas: parcelasCalc.map((p) => ({ n: p.numero, v: p.valor, d: p.data_vencimento })),
    };
    const hash = await hashPayload(payloadCanonico);

    // Replay-safe por (origem_sistema, externo_id)
    if (input.origem_sistema && input.externo_id) {
      const { data: existente } = await supabase
        .from('venda_pagamento')
        .select('*')
        .eq('empresa_representada_id', input.empresa_representada_id)
        .eq('origem_sistema', input.origem_sistema)
        .eq('externo_id', input.externo_id)
        .maybeSingle();
      if (existente) {
        if (existente.hash_payload && existente.hash_payload !== hash) {
          throw new ConflictPayloadError();
        }
        const parcelas = await this.listParcelas(existente.id);
        return { pagamento: existente as VendaPagamento, parcelas, replay: true };
      }
    }

    // Insere linha de pagamento
    const { data: pag, error: e1 } = await supabase
      .from('venda_pagamento')
      .insert({
        empresa_representada_id: input.empresa_representada_id,
        venda_id: input.venda_id,
        modalidade_id: input.modalidade_id,
        plano_pagamento_id: input.plano_pagamento_id ?? null,
        natureza_id: input.natureza_id ?? null,
        plano_snapshot: (input.plano_snapshot ?? {}) as Json,
        valor_bruto,
        valor_desconto,
        valor_juros,
        valor_liquido,
        qtd_parcelas: input.qtd_parcelas,
        percentual_entrada: input.percentual_entrada ?? 0,
        origem_canal: input.origem_canal ?? 'ERP',
        origem_sistema: input.origem_sistema ?? null,
        externo_id: input.externo_id ?? null,
        idempotency_key: input.idempotency_key ?? null,
        hash_payload: hash,
        operador_id: input.operador_id ?? null,
      })
      .select()
      .single();
    if (e1) throw new Error(friendlyError(e1));

    // Insere parcelas
    const parcelasPayload = parcelasCalc.map((p) => ({
      empresa_representada_id: input.empresa_representada_id,
      venda_pagamento_id: pag.id,
      numero: p.numero,
      valor: p.valor,
      valor_juros: p.valor_juros,
      data_vencimento: p.data_vencimento,
      is_entrada: p.is_entrada,
    }));

    const { data: parc, error: e2 } = await supabase
      .from('venda_pagamento_parcelas')
      .insert(parcelasPayload)
      .select();
    if (e2) throw new Error(friendlyError(e2));

    return { pagamento: pag as VendaPagamento, parcelas: (parc as VendaPagamentoParcela[]) ?? [], replay: false };
  },

  async removerPagamento(pagamentoId: string): Promise<void> {
    const { error } = await supabase.from('venda_pagamento').delete().eq('id', pagamentoId);
    if (error) throw new Error(friendlyError(error));
  },

  async validarPagamentoVenda(vendaId: string): Promise<ValidacaoPagamentoResult> {
    const { data, error } = await supabase.rpc('validar_pagamento_venda', { p_venda_id: vendaId });
    if (error) throw new Error(friendlyError(error));
    return data as unknown as ValidacaoPagamentoResult;
  },
};
