// Edge Function: fiscal-emitir-nfe
//
// Fluxo (Fase 2 - parte interna):
// 1. Autentica usuário e verifica role admin.
// 2. Carrega venda + itens + cliente + empresa.
// 3. Gera payload via mapper vendaToNFePayload.
// 4. Insere/atualiza documento em fiscal_documentos_eletronicos (status=processando).
// 5. Chama FiscalProvider.emitNFe — MOCKADO por padrão até o token ser configurado.
// 6. Atualiza documento com resultado + registra evento em fiscal_eventos.
//
// Ative a chamada real definindo FISCAL_MOCK=false no ambiente (após configurar
// FISCAL_PROVIDER_API_KEY_HOM).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { vendaToNFePayload, VendaMapperError } from '../_shared/fiscal/mappers/vendaToNFePayload.ts';
import { resolveFiscalProvider } from '../_shared/fiscal/providers/resolveFiscalProvider.ts';
import type {
  FiscalEnvironment,
  FiscalProviderName,
  NFeEmitResult,
} from '../_shared/fiscal/providers/FiscalProvider.ts';

interface EmitirRequest {
  vendaId: string;
  provider?: FiscalProviderName; // padrão: focusnfe
  environment?: FiscalEnvironment; // padrão: homologation
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);

    const { data: isAdmin, error: roleErr } = await client.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) return json({ error: 'forbidden' }, 403);

    const body = (await req.json()) as EmitirRequest;
    if (!body?.vendaId) return json({ error: 'invalid_input', missing: ['vendaId'] }, 400);

    const providerName: FiscalProviderName = body.provider ?? 'focusnfe';
    const environment: FiscalEnvironment = body.environment ?? 'homologation';

    // 1) Carrega dados
    const { data: venda, error: vErr } = await client
      .from('vendas')
      .select('*')
      .eq('id', body.vendaId)
      .maybeSingle();
    if (vErr || !venda) return json({ error: 'venda_not_found', details: vErr?.message }, 404);

    const { data: itens, error: iErr } = await client
      .from('itens_venda')
      .select('*')
      .eq('venda_id', body.vendaId)
      .order('ordem', { ascending: true });
    if (iErr) return json({ error: 'itens_load_failed', details: iErr.message }, 500);

    const { data: cliente, error: cErr } = await client
      .from('clientes')
      .select('*')
      .eq('id', venda.cliente_id)
      .maybeSingle();
    if (cErr || !cliente) return json({ error: 'cliente_not_found', details: cErr?.message }, 404);

    const { data: empresa, error: eErr } = await client
      .from('empresas_representadas')
      .select('*')
      .eq('id', venda.empresa_representada_id)
      .maybeSingle();
    if (eErr || !empresa) return json({ error: 'empresa_not_found', details: eErr?.message }, 404);

    // 2) Mapper
    let payload;
    try {
      payload = vendaToNFePayload({ venda, cliente, empresa, itens: itens ?? [] });
    } catch (err) {
      if (err instanceof VendaMapperError) {
        return json({ error: 'mapper_validation_failed', issues: err.issues, message: err.message }, 422);
      }
      throw err;
    }

    // 3) Insere documento em status "processando" (idempotente por chave)
    const idempotencyKey = payload.idempotencyKey;
    const { data: docExistente } = await client
      .from('fiscal_documentos_eletronicos')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (docExistente && ['autorizada', 'processando'].includes(docExistente.status)) {
      return json({
        error: 'duplicate_emission',
        message: 'Já existe NF-e em processamento ou autorizada para esta venda.',
        documento_id: docExistente.id,
      }, 409);
    }

    const docBase = {
      empresa_representada_id: venda.empresa_representada_id,
      venda_id: venda.id,
      cliente_id: venda.cliente_id,
      tipo: 'NFe',
      modelo: 55,
      serie: payload.serie,
      ambiente: environment === 'production' ? 'Producao' : 'Teste',
      data_emissao: payload.dataEmissao,
      valor_produtos: payload.valorTotal,
      valor_frete: 0,
      valor_desconto: 0,
      valor_outras_despesas: 0,
      valor_total: payload.valorTotal,
      valor_icms: 0,
      valor_icms_st: 0,
      valor_ipi: 0,
      valor_pis: 0,
      valor_cofins: 0,
      status: 'processando',
      provider: providerName,
      idempotency_key: idempotencyKey,
      created_by: userData.user.id,
      tentativas: 1,
      ultima_tentativa_at: new Date().toISOString(),
    };

    let documentoId: string;
    if (docExistente) {
      const { error } = await client
        .from('fiscal_documentos_eletronicos')
        .update({ ...docBase, tentativas: undefined })
        .eq('id', docExistente.id);
      if (error) return json({ error: 'db_update_failed', details: error.message }, 500);
      documentoId = docExistente.id;
    } else {
      const { data, error } = await client
        .from('fiscal_documentos_eletronicos')
        .insert(docBase)
        .select('id')
        .single();
      if (error || !data) return json({ error: 'db_insert_failed', details: error?.message }, 500);
      documentoId = data.id;
    }

    // 4) Chama provider (mockado por padrão)
    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';
    let result: NFeEmitResult;
    try {
      if (useMock) {
        result = mockEmitResult(idempotencyKey);
        console.log('[fiscal-emitir-nfe] MOCK ativo — nenhuma chamada real ao provedor.');
      } else {
        const provider = resolveFiscalProvider(providerName, environment);
        result = await provider.emitNFe(payload);
      }
    } catch (err) {
      const message = (err as Error).message ?? 'erro desconhecido';
      await client
        .from('fiscal_documentos_eletronicos')
        .update({ status: 'erro', motivo_rejeicao: message })
        .eq('id', documentoId);
      await client.from('fiscal_eventos').insert({
        empresa_representada_id: venda.empresa_representada_id,
        documento_id: documentoId,
        tipo: 'erro_emissao',
        status: 'erro',
        motivo_rejeicao: message,
        created_by: userData.user.id,
      });
      return json({ error: 'provider_error', message, documento_id: documentoId }, 502);
    }

    // 5) Persiste resultado + evento
    await client
      .from('fiscal_documentos_eletronicos')
      .update({
        status: result.status,
        provider_ref: result.providerRef,
        chave_acesso: result.chaveAcesso,
        protocolo_autorizacao: result.protocoloAutorizacao,
        codigo_status_sefaz: result.codigoStatusSefaz,
        motivo_rejeicao: result.motivoRejeicao,
        xml_url: result.xmlUrl,
        danfe_url: result.danfeUrl,
        pdf_danfe_url: result.danfeUrl,
        payload_provedor: (result.raw ?? null) as unknown,
      })
      .eq('id', documentoId);

    await client.from('fiscal_eventos').insert({
      empresa_representada_id: venda.empresa_representada_id,
      documento_id: documentoId,
      tipo: result.status === 'autorizada' ? 'autorizacao' : 'processamento',
      protocolo: result.protocoloAutorizacao,
      status: result.status,
      motivo_rejeicao: result.motivoRejeicao,
      payload_provedor: (result.raw ?? null) as unknown,
      created_by: userData.user.id,
    });

    // 6) TODO Fase 3: baixar XML/DANFE reais e subir para Storage
    if (useMock) {
      console.log('[fiscal-emitir-nfe] MOCK: simulando upload de XML/DANFE para Storage', {
        xml_url: result.xmlUrl,
        danfe_url: result.danfeUrl,
      });
    }

    return json({
      ok: true,
      documento_id: documentoId,
      status: result.status,
      provider_ref: result.providerRef,
      chave_acesso: result.chaveAcesso,
      xml_url: result.xmlUrl,
      danfe_url: result.danfeUrl,
      mock: useMock,
    }, 200);
  } catch (err) {
    console.error('[fiscal-emitir-nfe] erro inesperado', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function mockEmitResult(ref: string): NFeEmitResult {
  const chaveMock = '35' + Date.now().toString().padStart(42, '0').slice(-42);
  return {
    status: 'processando',
    providerRef: ref,
    chaveAcesso: chaveMock,
    protocoloAutorizacao: undefined,
    codigoStatusSefaz: '100',
    motivoRejeicao: undefined,
    xmlUrl: `mock://fiscal-xml/${ref}.xml`,
    danfeUrl: `mock://fiscal-danfe/${ref}.pdf`,
    raw: { mock: true, ref },
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
