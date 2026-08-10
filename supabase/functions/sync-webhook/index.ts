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
        result = await syncCliente(supabase, payload, empresaId);
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

async function syncCliente(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string) {
  const { event, data } = payload;
  const cpf = (data.cpf as string) || undefined;
  const cnpj = (data.cnpj as string) || undefined;
  let existingCliente: { id: string } | null = null;
  if (cpf || cnpj) {
    const filters = [cpf && `cpf.eq.${cpf}`, cnpj && `cnpj.eq.${cnpj}`].filter(Boolean).join(',');
    const { data: found } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(filters)
      .maybeSingle();
    existingCliente = found;
  }

  switch (event) {
    case 'insert':
    case 'sync':
    case 'update':
      if (existingCliente) {
        return await supabase
          .from('clientes')
          .update({
            ...(await mapClienteData(data, payload.source_system, empresaId)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCliente.id)
          .eq('empresa_representada_id', empresaId)
          .select()
          .single();
      }
      return await supabase
        .from('clientes')
        .insert(await mapClienteData(data, payload.source_system, empresaId))
        .select()
        .single();
    case 'delete':
      if (!existingCliente) return { data: null, error: null };
      return await supabase
        .from('clientes')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', existingCliente.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .single();
  }
}

async function syncVenda(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string) {
  const { event, data } = payload;
  let clienteId = null;
  if (data.cliente_id) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .or(`external_id.eq.${data.cliente_id},cpf_cnpj.eq.${data.cliente_cpf_cnpj}`)
      .single();
    clienteId = cliente?.id;
  }
  const vendaData = {
    empresa_representada_id: empresaId,
    numero_venda: data.numero_venda || data.id,
    cliente_id: clienteId,
    data_venda: data.data_venda || new Date().toISOString(),
    valor_total: data.valor_total || data.total,
    valor_desconto: data.valor_desconto || 0,
    valor_acrescimo: data.valor_acrescimo || 0,
    itens: data.itens || [],
    forma_pagamento: data.forma_pagamento,
    status: data.status || 'finalizada',
    observacoes: data.observacoes,
    source_system: payload.source_system,
    sync_metadata: {
      external_id: data.id,
      synchronized_at: new Date().toISOString(),
      source_data: data,
    },
  };
  switch (event) {
    case 'insert':
    case 'sync':
      return await supabase.from('vendas').insert(vendaData).select().single();
    case 'update':
      return await supabase
        .from('vendas')
        .update({ ...vendaData, updated_at: new Date().toISOString() })
        .eq('numero_venda', data.numero_venda || data.id)
        .eq('empresa_representada_id', empresaId)
        .select()
        .single();
  }
}

async function syncContrato(supabase: SupabaseClient, payload: WebhookPayload, empresaId: string) {
  const { event, data } = payload;
  let clienteId = null;
  if (data.cliente_cpf_cnpj) {
    const cpfCnpj = data.cliente_cpf_cnpj as string;
    const { data: cliente } = await supabase
      .from('clientes')
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
      .from('clientes')
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

// clientes tem dois conjuntos de coluna coexistindo: as "novas" (tipo_pessoa/
// cpf/cnpj), escritas aqui desde sempre, e as "legadas" (tipo/cpf_cnpj/
// endereco/apelido) restauradas pela migration 20260725150000 e lidas pela
// UI real do ERP (clienteService.ts/FormCliente.tsx). Sem popular as legadas,
// um cliente criado via satélite existe no banco mas aparece em branco pra
// quem usa a tela de Clientes do próprio ERP.
function buildEnderecoLegado(data: Record<string, unknown>): Record<string, unknown> | null {
  if (data.endereco && typeof data.endereco === 'object') {
    return data.endereco as Record<string, unknown>;
  }
  const camposDiretos = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'pais'] as const;
  const endereco: Record<string, unknown> = {};
  let temAlgo = false;
  for (const campo of camposDiretos) {
    if (data[campo] !== undefined) {
      endereco[campo] = data[campo];
      temAlgo = true;
    }
  }
  const uf = data.uf ?? data.estado;
  if (uf !== undefined) {
    endereco.uf = uf;
    temAlgo = true;
  }
  return temAlgo ? endereco : null;
}

async function mapClienteData(data: Record<string, unknown>, sourceSystem: string, empresaId: string) {
  const cpf = (data.cpf as string) || null;
  const cnpj = (data.cnpj as string) || null;
  const tipoPessoa = (data.tipo_pessoa as string) || (cpf ? 'PF' : cnpj ? 'PJ' : null);
  const endereco = buildEnderecoLegado(data);

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
    // Colunas legadas — tipo/cpf_cnpj são sempre deriváveis do que já chega,
    // sempre setados. apelido/data_nascimento/endereco só entram quando o
    // payload realmente traz algo: um update parcial (ex. só e-mail mudou)
    // não pode apagar dado que um humano digitou na tela do ERP.
    tipo: tipoPessoa === 'PJ' ? 'J' : 'F',
    cpf_cnpj: cpf || cnpj || null,
    origem_canal: 'webhook',
    origem_sistema: sourceSystem,
    externo_id: (data.id as string) ?? null,
    idempotency_key:
      (data.idempotency_key as string) || `${sourceSystem}:cliente:${cpf || cnpj || data.id}`,
    hash_payload: await sha256Hex(new TextEncoder().encode(JSON.stringify(data))),
  };

  if (data.apelido !== undefined) mapped.apelido = data.apelido;
  if (data.data_nascimento !== undefined) mapped.data_nascimento = data.data_nascimento;
  if (endereco) mapped.endereco = endereco;

  return mapped;
}
