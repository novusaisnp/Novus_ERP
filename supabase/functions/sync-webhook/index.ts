import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-source-system, x-empresa-id, x-webhook-timestamp, x-webhook-delivery, x-webhook-attempt',
};

const TS_SKEW_MS =
  Number(Deno.env.get('WEBHOOK_TS_SKEW_SECONDS') ?? '300') * 1000;

interface WebhookPayload {
  event: 'insert' | 'update' | 'delete' | 'sync';
  table: string;
  data: Record<string, unknown>;
  old_data?: Record<string, unknown>;
  timestamp: string;
  source_system: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha256Hex(rawBody: Uint8Array, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, rawBody);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const CANONICAL_METHOD = 'POST';
const CANONICAL_PATH = '/functions/v1/sync-webhook';

async function hmacHexOverString(canonical: string, secret: string): Promise<string> {
  return hmacSha256Hex(new TextEncoder().encode(canonical), secret);
}

function buildCanonicalV2(
  timestampEpochSec: string,
  deliveryId: string,
  bodyHashHex: string,
): string {
  return [CANONICAL_METHOD, CANONICAL_PATH, timestampEpochSec, deliveryId, bodyHashHex].join('\n');
}

function timestampToEpochSecondsString(raw: string | null): string | null {
  if (!raw) return null;
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum > 0) {
    return asNum < 1e12 ? String(Math.trunc(asNum)) : String(Math.trunc(asNum / 1000));
  }
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  return String(Math.trunc(parsed / 1000));
}

function parseTimestampMs(raw: string | null): number | null {
  if (!raw) return null;
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum > 0) {
    // epoch seconds heuristic
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ---- Read headers ----
  const signatureV1 = req.headers.get('x-webhook-signature');
  const signatureV2 = req.headers.get('x-webhook-signature-v2');
  const sourceSystem = req.headers.get('x-source-system');
  const empresaId = req.headers.get('x-empresa-id');
  const tsHeader = req.headers.get('x-webhook-timestamp');
  const deliveryHeader = req.headers.get('x-webhook-delivery');
  const attempt = Number(req.headers.get('x-webhook-attempt') ?? '1') || 1;

  const logCtx: Record<string, unknown> = {
    request_id: requestId,
    tenant: empresaId,
    source: sourceSystem,
    delivery_id: deliveryHeader,
    attempt,
  };

  const finish = (
    body: Record<string, unknown>,
    status: number,
    outcome: string,
    extras: Record<string, unknown> = {},
  ) => {
    const latency = Date.now() - startTime;
    console.log(
      JSON.stringify({
        ...logCtx,
        ...extras,
        outcome,
        status_code: status,
        latency_ms: latency,
      }),
    );
    return jsonResponse({ ...body, request_id: requestId }, status);
  };

  // ---- Basic header validation ----
  if ((!signatureV1 && !signatureV2) || !sourceSystem || !empresaId) {
    return finish(
      {
        success: false,
        error:
          'x-source-system, x-empresa-id e uma assinatura (x-webhook-signature ou x-webhook-signature-v2) são obrigatórios',
      },
      400,
      'bad_request',
      { reason: 'missing_headers' },
    );
  }

  // ---- Raw body (bytes) — needed for HMAC + synthetic delivery id ----
  const rawBody = new Uint8Array(await req.arrayBuffer());
  if (rawBody.byteLength === 0) {
    return finish({ success: false, error: 'empty_body' }, 400, 'bad_request');
  }

  // ---- Resolve config (strict_mode + signature governance) ----
  const { data: config, error: cfgError } = await supabase
    .from('webhook_configs')
    .select(
      'secret_token, ativo, empresa_representada_id, strict_mode, signature_version, v2_only',
    )
    .eq('nome', sourceSystem)
    .eq('empresa_representada_id', empresaId)
    .eq('ativo', true)
    .maybeSingle();

  if (cfgError || !config || !config.secret_token) {
    return finish(
      { success: false, error: 'unauthorized' },
      401,
      'unauthorized',
      { reason: 'config_not_found' },
    );
  }

  const strictMode: boolean = Boolean(config.strict_mode);
  const cfgSigVersion: string = String(config.signature_version ?? 'v1');
  const v2Only: boolean = Boolean(config.v2_only);
  logCtx.strict_mode = strictMode;

  // ---- Signature validation (dual: V2 preferred, V1 fallback if allowed) ----
  const bodyHashHex = await sha256Hex(rawBody);
  let signatureVersionUsed: 'v1' | 'v2' | null = null;

  if (signatureV2) {
    const tsEpochSec = timestampToEpochSecondsString(tsHeader);
    if (!tsEpochSec || !deliveryHeader) {
      return finish(
        { success: false, error: 'v2_requires_timestamp_and_delivery' },
        400,
        'bad_request',
        {
          reason: 'v2_missing_headers',
          signature_version: 'v2',
          signature_outcome: 'missing_v2',
        },
      );
    }
    const canonical = buildCanonicalV2(tsEpochSec, deliveryHeader, bodyHashHex);
    const expectedV2 = await hmacHexOverString(canonical, config.secret_token);
    const providedV2 = signatureV2.replace(/^sha256=/i, '');
    if (!timingSafeEqual(expectedV2, providedV2)) {
      return finish(
        { success: false, error: 'invalid_signature_v2' },
        401,
        'unauthorized',
        {
          reason: 'invalid_signature_v2',
          signature_version: 'v2',
          signature_outcome: 'invalid_v2',
        },
      );
    }
    signatureVersionUsed = 'v2';
  } else {
    // No V2 header
    if (v2Only || cfgSigVersion === 'v2') {
      return finish(
        { success: false, error: 'signature_version_required' },
        400,
        'bad_request',
        {
          reason: 'v2_required',
          signature_version: null,
          signature_outcome: 'missing_v2',
        },
      );
    }
    // Validate V1 legacy on RAW BODY
    const expectedV1 = await hmacSha256Hex(rawBody, config.secret_token);
    const providedV1 = (signatureV1 ?? '').replace(/^sha256=/i, '');
    if (!timingSafeEqual(expectedV1, providedV1)) {
      return finish(
        { success: false, error: 'unauthorized' },
        401,
        'unauthorized',
        {
          reason: 'invalid_signature_v1',
          signature_version: 'v1',
          signature_outcome: 'invalid_v1',
        },
      );
    }
    signatureVersionUsed = 'v1';
  }
  logCtx.signature_version = signatureVersionUsed;
  logCtx.signature_outcome = 'ok';

  // ---- Timestamp / anti-replay ----
  const nowMs = Date.now();
  const tsMs = parseTimestampMs(tsHeader);
  let tsSkewMs: number | null = null;

  if (tsMs !== null) {
    tsSkewMs = nowMs - tsMs;
    logCtx.ts_skew_ms = tsSkewMs;
    if (Math.abs(tsSkewMs) > TS_SKEW_MS) {
      if (strictMode) {
        return finish(
          { success: false, error: 'timestamp_out_of_window', ts_skew_ms: tsSkewMs },
          400,
          'bad_request',
          { reason: 'timestamp_out_of_window' },
        );
      }
    }
  } else if (strictMode) {
    return finish(
      { success: false, error: 'missing_timestamp' },
      400,
      'bad_request',
      { reason: 'missing_timestamp' },
    );
  }

  // ---- Delivery ID / idempotency key ----
  let deliveryId = deliveryHeader;
  let synthetic = false;
  if (!deliveryId) {
    if (strictMode) {
      return finish(
        { success: false, error: 'missing_delivery_id' },
        400,
        'bad_request',
        { reason: 'missing_delivery_id' },
      );
    }
    deliveryId = await sha256Hex(rawBody);
    synthetic = true;
  }
  logCtx.delivery_id = deliveryId;

  // ---- INSERT FIRST into webhook_deliveries ----
  const { error: dedupError } = await supabase
    .from('webhook_deliveries')
    .insert({
      empresa_representada_id: empresaId,
      source_system: sourceSystem,
      delivery_id: deliveryId,
      synthetic,
      ts_skew_ms: tsSkewMs,
      request_id: requestId,
      outcome: 'accepted',
      signature_version: signatureVersionUsed,
    });

  if (dedupError) {
    if (dedupError.code === '23505') {
      return finish(
        {
          success: true,
          duplicate: true,
          error: 'duplicate_delivery_ignored',
          delivery_id: deliveryId,
        },
        200,
        'duplicate',
      );
    }
    return finish(
      { success: false, error: 'dedup_error', details: dedupError.message },
      500,
      'error',
      { reason: 'dedup_insert_failed' },
    );
  }

  // ---- Parse body AFTER validations passed ----
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    await supabase
      .from('webhook_deliveries')
      .update({ outcome: 'error', execution_time_ms: Date.now() - startTime })
      .eq('empresa_representada_id', empresaId)
      .eq('source_system', sourceSystem)
      .eq('delivery_id', deliveryId);
    return finish(
      { success: false, error: 'invalid_json' },
      400,
      'bad_request',
      { reason: 'invalid_json' },
    );
  }

  try {
    // ---- Register sync_log (schema real: tipo/origem/payload_entrada/...) ----
    const { data: logEntry, error: logInsertError } = await supabase
      .from('sync_logs')
      .insert({
        empresa_representada_id: empresaId,
        tipo: `${payload.event}:${payload.table}`,
        status: 'PENDENTE',
        origem: sourceSystem,
        destino: 'sync-webhook',
        payload_entrada: payload,
        tentativas: 0,
        delivery_id: deliveryId,
      })
      .select()
      .single();

    if (logInsertError || !logEntry) {
      throw new Error(
        `Falha ao criar log de sincronização: ${logInsertError?.message ?? 'no row'}`,
      );
    }

    // ---- Dispatch by table ----
    // empresaId já validado contra webhook_configs acima — toda escrita de domínio
    // abaixo precisa ficar escopada a essa empresa (nunca confiar em payload.data pra isso).
    let result: unknown;
    switch (payload.table.toLowerCase()) {
      case 'clientes':
        // Compat: satélite ainda não migrado manda table:'clientes' sem
        // `papeis` — trata como CLIENTE (mesmo comportamento de sempre).
        result = await syncEntidade(supabase, payload, empresaId, ['CLIENTE']);
        break;
      case 'entidades':
        result = await syncEntidade(supabase, payload, empresaId);
        break;
      case 'vendas':
        result = await syncVenda(supabase, payload, empresaId);
        break;
      case 'contratos':
        result = await syncContrato(supabase, payload, empresaId);
        break;
      case 'contas_receber':
      case 'financeiro':
        result = await syncFinanceiro(supabase, payload, empresaId);
        break;
      case 'e2e_noop':
        // Reserved for E2E validation: bypass domain sync so signature/idempotency
        // contract can be validated end-to-end without depending on domain tables.
        result = { e2e: true, noop: true };
        break;
      default:
        throw new Error(`Tabela não suportada: ${payload.table}`);
    }

    const executionTime = Date.now() - startTime;

    await supabase
      .from('sync_logs')
      .update({
        status: 'SUCESSO',
        processado_em: new Date().toISOString(),
        payload_saida: { result },
      })
      .eq('id', logEntry.id);

    await supabase
      .from('webhook_deliveries')
      .update({
        outcome: 'processed',
        sync_log_id: logEntry.id,
        execution_time_ms: executionTime,
      })
      .eq('empresa_representada_id', empresaId)
      .eq('source_system', sourceSystem)
      .eq('delivery_id', deliveryId);

    return finish(
      {
        success: true,
        message: 'Sincronização realizada com sucesso',
        sync_id: logEntry.id,
        delivery_id: deliveryId,
        execution_time_ms: executionTime,
        result,
      },
      200,
      'processed',
    );
  } catch (error) {
    const execMs = Date.now() - startTime;
    await supabase
      .from('webhook_deliveries')
      .update({ outcome: 'error', execution_time_ms: execMs })
      .eq('empresa_representada_id', empresaId)
      .eq('source_system', sourceSystem)
      .eq('delivery_id', deliveryId);

    return finish(
      { success: false, error: (error as Error).message },
      500,
      'error',
      { reason: 'processing_error' },
    );
  }
});

// ============================================================
// Domain sync helpers (unchanged behaviour from previous version)
// ============================================================

async function ensurePapeis(supabase: SupabaseClient, entidadeId: string, empresaId: string, papeis: string[]) {
  await supabase
    .from('entidade_papeis')
    .upsert(
      papeis.map((papel) => ({ entidade_id: entidadeId, empresa_representada_id: empresaId, papel })),
      { onConflict: 'entidade_id,papel', ignoreDuplicates: true },
    );
}

// `papeisDefault` cobre o caso table:'clientes' (satélite ainda não migrado,
// payload sem `papeis` — sempre CLIENTE). Em table:'entidades', `data.papeis`
// é a fonte de verdade.
async function syncEntidade(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string, papeisDefault?: string[]) {
  const { event, data } = payload;
  const papeis = (Array.isArray(data.papeis) ? data.papeis as string[] : papeisDefault) ?? ['CLIENTE'];
  const cpf = (data.cpf as string) || undefined;
  const cnpj = (data.cnpj as string) || undefined;
  let existingEntidade: { id: string } | null = null;
  if (cpf || cnpj) {
    const filters = [cpf && `cpf.eq.${cpf}`, cnpj && `cnpj.eq.${cnpj}`].filter(Boolean).join(',');
    const { data: found } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(filters)
      .maybeSingle();
    existingEntidade = found;
  }

  switch (event) {
    case 'insert':
    case 'sync':
    case 'update': {
      if (existingEntidade) {
        const result = await supabase
          .from('entidades')
          .update({
            ...(await mapEntidadeData(data, payload.source_system, empresaId)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingEntidade.id)
          .eq('empresa_representada_id', empresaId)
          .select()
          .single();
        await ensurePapeis(supabase, existingEntidade.id, empresaId, papeis);
        return result;
      }
      const result = await supabase
        .from('entidades')
        .insert(await mapEntidadeData(data, payload.source_system, empresaId))
        .select()
        .single();
      if (result.data?.id) await ensurePapeis(supabase, result.data.id, empresaId, papeis);
      return result;
    }
    case 'delete':
      if (!existingEntidade) return { data: null, error: null };
      return await supabase
        .from('entidades')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', existingEntidade.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .single();
  }
}

// Payload de item, formato vendaCanonicalSchema (CONTRATOS_CANONICOS_ERP.md §5/§9):
// { descricao, quantidade, preco_unitario, produto_id?, servico_id?, ... }.
// itens_venda é tabela própria (sem coluna jsonb em vendas) — cada linha vira
// uma row aqui, mesmo cálculo de valor_total_item usado por vendasService.save().
function buildItensVendaRows(
  itens: Array<Record<string, unknown>>,
  vendaId: string,
  empresaId: string,
) {
  return itens.map((it, idx) => {
    const quantidade = Number(it.quantidade) || 0;
    const precoUnitario = Number(it.preco_unitario) || 0;
    const descontoItem = Number(it.desconto_item) || 0;
    const acrescimoItem = Number(it.acrescimo_item) || 0;
    const bruto = quantidade * precoUnitario;
    return {
      venda_id: vendaId,
      empresa_representada_id: empresaId,
      tipo_item: it.servico_id ? 'S' : 'P',
      produto_id: (it.produto_id as string) || null,
      servico_id: (it.servico_id as string) || null,
      descricao: (it.descricao as string) || '',
      quantidade,
      unidade: (it.unidade as string) || null,
      preco_unitario: precoUnitario,
      desconto_item: descontoItem,
      acrescimo_item: acrescimoItem,
      valor_total_item: bruto - descontoItem + acrescimoItem,
      ordem: idx,
      observacoes: (it.observacoes as string) || null,
    };
  });
}

// AUDITORIA_NOVA.md Fase "engate rápido": versão anterior não batia com o
// schema real de `vendas` (usava valor_desconto/valor_acrescimo/forma_pagamento/
// itens/source_system/sync_metadata — nenhuma dessas colunas existe), sem
// idempotência real e sem o envelope de origem. Reescrita no mesmo padrão de
// syncContrato/syncEntidade: idempotency_key + hash_payload como fonte de
// verdade de replay, envelope completo, e grava itens_venda de verdade (não
// existe coluna jsonb de itens em vendas).
async function syncVenda(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string) {
  const { event, data } = payload;
  let clienteId: string | null = null;
  if (data.cliente_cpf_cnpj || data.cliente_id) {
    const cpfCnpj = data.cliente_cpf_cnpj as string | undefined;
    const filtros = [
      data.cliente_id && `externo_id.eq.${data.cliente_id}`,
      cpfCnpj && `cpf.eq.${cpfCnpj}`,
      cpfCnpj && `cnpj.eq.${cpfCnpj}`,
    ].filter(Boolean).join(',');
    const { data: cliente } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(filtros)
      .maybeSingle();
    clienteId = cliente?.id ?? null;
  }

  const idempotencyKey =
    (data.idempotency_key as string) ||
    `${payload.source_system}:venda:${data.numero_venda ?? data.id}`;
  const hashPayload = await sha256Hex(new TextEncoder().encode(JSON.stringify(data)));

  const itensPayload = Array.isArray(data.itens) ? (data.itens as Array<Record<string, unknown>>) : [];
  const subtotalItens = itensPayload.reduce((acc, it) => {
    const bruto = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
    return acc + bruto - (Number(it.desconto_item) || 0) + (Number(it.acrescimo_item) || 0);
  }, 0);
  const desconto = Number(data.desconto) || 0;
  const acrescimo = Number(data.acrescimo) || 0;
  const valorFrete = Number(data.valor_frete) || 0;
  const valorTotal =
    data.valor_total != null ? Number(data.valor_total) : subtotalItens - desconto + acrescimo + valorFrete;

  const vendaData = {
    empresa_representada_id: empresaId,
    numero_venda: (data.numero_venda as string) || (data.id as string) || null,
    cliente_id: clienteId,
    data_venda: (data.data_venda as string) || new Date().toISOString().split('T')[0],
    // vendaCanonicalSchema exige status no enum real (RASCUNHO|CONFIRMADO|
    // EM_PRODUCAO|FATURADO|ENTREGUE|CANCELADO) — a versão antiga aceitava
    // 'finalizada' (minúsculo, fora do enum) sem validar.
    status: ((data.status as string) || 'CONFIRMADO').toString().toUpperCase(),
    tipo: (data.tipo as string) || 'P',
    subtotal: subtotalItens,
    desconto,
    acrescimo,
    valor_frete: valorFrete,
    valor_total: valorTotal,
    observacoes: (data.observacoes as string) || null,
    // vendaCanonicalSchema: um satélite só deve preenchê-lo quando já souber
    // resolver seu vendedor/operador para um usuário real do NOVUS (ex.: PDV
    // com login federado). Ausente/null é o caminho normal.
    vendedor_id: (data.vendedor_id as string) || null,
    origem_canal: 'webhook',
    origem_sistema: payload.source_system,
    externo_id: (data.id as string) ?? null,
    idempotency_key: idempotencyKey,
    hash_payload: hashPayload,
  };

  switch (event) {
    case 'insert':
    case 'sync': {
      const { data: existing } = await supabase
        .from('vendas')
        .select('id, hash_payload')
        .eq('empresa_representada_id', empresaId)
        .eq('idempotency_key', idempotencyKey)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        if (existing.hash_payload !== hashPayload) {
          throw new Error(
            `CONFLITO_PAYLOAD_DIVERGENTE: venda com idempotency_key=${idempotencyKey} já existe com payload diferente`,
          );
        }
        const replayed = await supabase.from('vendas').select().eq('id', existing.id).single();
        return { ...replayed, replay: true };
      }

      const inserted = await supabase.from('vendas').insert(vendaData).select().single();
      if (inserted.error) {
        if ((inserted.error as { code?: string }).code === '23505') {
          // condição de corrida: outra chamada concorrente inseriu entre o SELECT acima e este INSERT
          const race = await supabase
            .from('vendas')
            .select()
            .eq('empresa_representada_id', empresaId)
            .eq('idempotency_key', idempotencyKey)
            .single();
          return { ...race, replay: true };
        }
        return inserted;
      }

      const vendaId = inserted.data.id as string;
      if (itensPayload.length > 0) {
        const rows = buildItensVendaRows(itensPayload, vendaId, empresaId);
        const { error: itensError } = await supabase.from('itens_venda').insert(rows);
        if (itensError) {
          // não deixa um cabeçalho de venda sem os itens que vieram no mesmo payload
          await supabase.from('vendas').delete().eq('id', vendaId);
          throw new Error(`Falha ao gravar itens da venda: ${itensError.message}`);
        }
      }

      return inserted;
    }
    case 'update': {
      const { data: existing } = await supabase
        .from('vendas')
        .select('id')
        .eq('numero_venda', data.numero_venda || data.id)
        .eq('empresa_representada_id', empresaId)
        .maybeSingle();
      if (!existing) {
        throw new Error(`VENDA_NAO_ENCONTRADA: numero_venda=${data.numero_venda ?? data.id}`);
      }

      const updated = await supabase
        .from('vendas')
        .update({ ...vendaData, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (itensPayload.length > 0) {
        const { error: delErr } = await supabase.from('itens_venda').delete().eq('venda_id', existing.id);
        if (delErr) throw new Error(`Falha ao limpar itens da venda: ${delErr.message}`);
        const rows = buildItensVendaRows(itensPayload, existing.id, empresaId);
        const { error: itensError } = await supabase.from('itens_venda').insert(rows);
        if (itensError) throw new Error(`Falha ao atualizar itens da venda: ${itensError.message}`);
      }

      return updated;
    }
  }
}

async function syncContrato(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string) {
  const { event, data } = payload;
  let clienteId = null;
  if (data.cliente_cpf_cnpj) {
    const cpfCnpj = data.cliente_cpf_cnpj as string;
    const { data: cliente } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(`cpf.eq.${cpfCnpj},cnpj.eq.${cpfCnpj}`)
      .maybeSingle();
    clienteId = cliente?.id;
  }
  // idempotency_key: satélites novos devem mandar um explícito (estável,
  // gerado por eles); fallback aqui só cobre quem ainda não manda.
  const idempotencyKey =
    (data.idempotency_key as string) ||
    `${payload.source_system}:contrato:${data.numero_contrato ?? data.id}`;
  const hashPayload = await sha256Hex(new TextEncoder().encode(JSON.stringify(data)));

  const contratoData = {
    empresa_representada_id: empresaId,
    numero_contrato: data.numero_contrato || data.id,
    titulo: data.titulo || data.numero_contrato || `Contrato ${data.id}`,
    cliente_id: clienteId,
    data_inicio: data.data_inicio,
    data_fim: data.data_fim,
    valor_mensal: data.valor_mensal,
    valor_total: data.valor_total,
    dia_vencimento: data.dia_vencimento ?? null,
    status: (data.status || 'ATIVO').toString().toUpperCase(),
    gera_financeiro: data.gera_financeiro ?? true,
    observacoes: data.observacoes,
    origem_canal: 'webhook',
    origem_sistema: payload.source_system,
    externo_id: (data.id as string) ?? null,
    idempotency_key: idempotencyKey,
    hash_payload: hashPayload,
  };
  switch (event) {
    case 'insert':
    case 'sync': {
      // Sem isto, todo retry de webhook criava uma linha nova de Contrato
      // (insert incondicional) — inclusive redisparando o trigger
      // gerar_titulo_inicial_contrato a cada retry.
      const { data: existing } = await supabase
        .from('contratos')
        .select('id, hash_payload')
        .eq('empresa_representada_id', empresaId)
        .eq('idempotency_key', idempotencyKey)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        if (existing.hash_payload !== hashPayload) {
          throw new Error(
            `CONFLITO_PAYLOAD_DIVERGENTE: contrato com idempotency_key=${idempotencyKey} já existe com payload diferente`,
          );
        }
        const replayed = await supabase.from('contratos').select().eq('id', existing.id).single();
        return { ...replayed, replay: true };
      }

      const inserted = await supabase.from('contratos').insert(contratoData).select().single();
      if (inserted.error && (inserted.error as { code?: string }).code === '23505') {
        // condição de corrida: outra chamada concorrente inseriu entre o SELECT acima e este INSERT
        const race = await supabase
          .from('contratos')
          .select()
          .eq('empresa_representada_id', empresaId)
          .eq('idempotency_key', idempotencyKey)
          .single();
        return { ...race, replay: true };
      }
      return inserted;
    }
    case 'update':
      return await supabase
        .from('contratos')
        .update({ ...contratoData, updated_at: new Date().toISOString() })
        .eq('numero_contrato', data.numero_contrato || data.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .maybeSingle();
  }
}

async function syncFinanceiro(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string) {
  const { event, data } = payload;
  let clienteId = null,
    vendaId = null;
  if (data.cliente_cpf_cnpj) {
    const cpfCnpj = data.cliente_cpf_cnpj as string;
    const { data: cliente } = await supabase
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(`cpf.eq.${cpfCnpj},cnpj.eq.${cpfCnpj}`)
      .maybeSingle();
    clienteId = cliente?.id;
  }
  if (data.venda_id) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('id')
      .eq('numero_venda', data.venda_id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();
    vendaId = venda?.id;
  }
  const financeiroData = {
    empresa_representada_id: empresaId,
    numero_documento: data.numero_documento || data.id,
    cliente_id: clienteId,
    venda_id: vendaId,
    descricao: data.descricao || data.observacoes || `Título ${data.numero_documento || data.id}`,
    data_emissao: data.data_emissao || new Date().toISOString().split('T')[0],
    data_vencimento: data.data_vencimento,
    data_recebimento: data.data_pagamento || null,
    valor_original: data.valor_original || data.valor,
    valor_recebido: data.valor_pago || 0,
    valor_desconto: data.valor_desconto || 0,
    status: data.status || 'PENDENTE',
    recorrente: data.recorrente ?? false,
    periodicidade: data.periodicidade ?? null,
    total_parcelas: data.total_parcelas ?? null,
    observacoes: data.observacoes,
    origem_sistema: payload.source_system,
    externo_id: data.id,
    idempotency_key:
      (data.idempotency_key as string) || `${payload.source_system}:${data.numero_documento || data.id}`,
  };
  switch (event) {
    case 'insert':
    case 'sync':
      return await supabase
        .from('contas_receber')
        .insert(financeiroData)
        .select()
        .single();
    case 'update':
      return await supabase
        .from('contas_receber')
        .update({ ...financeiroData, updated_at: new Date().toISOString() })
        .eq('numero_documento', data.numero_documento || data.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .single();
  }
}

// `entidades` é a forma canônica única — sem o par de colunas dual que
// `clientes` tinha (tipo/cpf_cnpj/endereco-jsonb "legado" vs.
// tipo_pessoa/cpf/cnpj/endereço-flat "novo"). Endereço entra achatado nas
// colunas reais; campos ausentes no payload não entram no objeto (update
// parcial não apaga dado que um humano digitou na tela do ERP).
async function mapEntidadeData(data: Record<string, unknown>, sourceSystem: string, empresaId: string) {
  const cpf = (data.cpf as string) || null;
  const cnpj = (data.cnpj as string) || null;
  const tipoPessoa = (data.tipo_pessoa as string) || (cpf ? 'PF' : cnpj ? 'PJ' : null);
  const enderecoObj = (data.endereco && typeof data.endereco === 'object') ? (data.endereco as Record<string, unknown>) : {};

  const mapped: Record<string, unknown> = {
    empresa_representada_id: empresaId,
    nome: data.nome || data.razao_social,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    tipo_pessoa: tipoPessoa,
    cpf,
    cnpj,
    rg: data.rg,
    email: data.email,
    telefone: data.telefone,
    observacoes: data.observacoes,
    ativo: data.ativo !== false,
    origem_canal: 'webhook',
    origem_sistema: sourceSystem,
    externo_id: (data.id as string) ?? null,
    idempotency_key:
      (data.idempotency_key as string) || `${sourceSystem}:cliente:${cpf || cnpj || data.id}`,
    hash_payload: await sha256Hex(new TextEncoder().encode(JSON.stringify(data))),
  };

  if (data.apelido !== undefined) mapped.apelido = data.apelido;
  if (data.data_nascimento !== undefined) mapped.data_nascimento = data.data_nascimento;
  const cep = data.cep ?? enderecoObj.cep;
  const logradouro = data.logradouro ?? enderecoObj.logradouro;
  const numero = data.numero ?? enderecoObj.numero;
  const complemento = data.complemento ?? enderecoObj.complemento;
  const bairro = data.bairro ?? enderecoObj.bairro;
  const cidade = data.cidade ?? enderecoObj.cidade;
  const estado = data.uf ?? data.estado ?? enderecoObj.uf;
  if (cep !== undefined) mapped.cep = cep;
  if (logradouro !== undefined) mapped.logradouro = logradouro;
  if (numero !== undefined) mapped.numero = numero;
  if (complemento !== undefined) mapped.complemento = complemento;
  if (bairro !== undefined) mapped.bairro = bairro;
  if (cidade !== undefined) mapped.cidade = cidade;
  if (estado !== undefined) mapped.estado = estado;

  return mapped;
}
