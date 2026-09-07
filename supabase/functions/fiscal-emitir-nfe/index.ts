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
import { hasEveryPermission } from '../_shared/permissions.ts';
import { pagamentosToNFCe, vendaToNFePayload, VendaMapperError } from '../_shared/fiscal/mappers/vendaToNFePayload.ts';
import { resolveFiscalProvider } from '../_shared/fiscal/providers/resolveFiscalProvider.ts';
import type {
  FiscalEnvironment,
  FiscalProviderName,
  NFeEmitResult,
  NFCeEmitPayload,
} from '../_shared/fiscal/providers/FiscalProvider.ts';

interface EmitirRequest {
  vendaId: string;
  tipo?: 'NFE' | 'NFCE';
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

    if (!await hasEveryPermission(client, userData.user.id, ['fiscal.create'])) {
      return json({ error: 'forbidden' }, 403);
    }

    const body = (await req.json()) as EmitirRequest;
    if (!body?.vendaId) return json({ error: 'invalid_input', missing: ['vendaId'] }, 400);
    const tipo = body.tipo ?? 'NFE';
    if (!['NFE', 'NFCE'].includes(tipo)) return json({ error: 'invalid_tipo' }, 400);

    // 1) Carrega dados
    const { data: venda, error: vErr } = await client
      .from('vendas')
      .select('*')
      .eq('id', body.vendaId)
      .maybeSingle();
    if (vErr || !venda) return json({ error: 'venda_not_found', details: vErr?.message }, 404);

    const { data: itens, error: iErr } = await client
      .from('itens_venda')
      .select('*, produto:produtos(codigo,ncm,origem_produto,dados_fiscais)')
      .eq('venda_id', body.vendaId)
      .order('ordem', { ascending: true });
    if (iErr) return json({ error: 'itens_load_failed', details: iErr.message }, 500);

    const { data: cliente, error: cErr } = await client
      .from('entidades')
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

    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';
    const { data: configFiscal, error: cfgErr } = await client
      .from('fiscal_configuracoes')
      .select('serie_nfe, serie_nfce, ambiente, provedor, regime_tributario, cnpj_emitente, inscricao_estadual')
      .eq('empresa_representada_id', venda.empresa_representada_id)
      .eq('ativo', true)
      .is('deleted_at', null)
      .maybeSingle();
    if (cfgErr) return json({ error: 'fiscal_config_load_failed', details: cfgErr.message }, 500);
    if (!useMock && !configFiscal) {
      return json({ error: 'fiscal_config_missing', message: 'Configure a empresa em Fiscal antes de emitir.' }, 422);
    }

    const { data: natureza } = await client
      .from('natureza_operacao')
      .select('descricao, cfop_dentro_estado, cfop_fora_estado')
      .eq('empresa_representada_id', venda.empresa_representada_id)
      .eq('tipo', 'venda')
      .eq('ativo', true)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    const providerName: FiscalProviderName = configFiscal?.provedor === 'FOCUS_NFE' || !configFiscal
      ? 'focusnfe'
      : (() => { throw new Error(`Provedor fiscal não implementado: ${configFiscal.provedor}`); })();
    const environment: FiscalEnvironment = configFiscal?.ambiente === 'PRODUCAO' ? 'production' : 'homologation';

    // 2) Mapper
    let payload;
    try {
      payload = vendaToNFePayload({
        venda,
        cliente,
        empresa,
        itens: itens ?? [],
        configFiscal: {
          serieNfe: configFiscal?.serie_nfe ?? 1,
          naturezaOperacao: natureza?.descricao ?? 'Venda de mercadoria',
          cfopPadraoInterno: natureza?.cfop_dentro_estado ?? '5102',
          cfopPadraoInterestadual: natureza?.cfop_fora_estado ?? '6102',
          regimeTributario: configFiscal?.regime_tributario,
          cnpjEmitente: configFiscal?.cnpj_emitente,
          inscricaoEstadual: configFiscal?.inscricao_estadual,
        },
      });
    } catch (err) {
      if (err instanceof VendaMapperError) {
        return json({ error: 'mapper_validation_failed', issues: err.issues, message: err.message }, 422);
      }
      throw err;
    }

    if (tipo === 'NFCE') {
      const { data: pagamentos, error: pagamentosErr } = await client
        .from('venda_pagamento')
        .select('valor_liquido, bandeira, autorizacao_nsu, modalidade:modalidades_pagamento(codigo)')
        .eq('venda_id', venda.id)
        .eq('empresa_representada_id', venda.empresa_representada_id)
        .is('deleted_at', null);
      if (pagamentosErr) return json({ error: 'pagamentos_load_failed', details: pagamentosErr.message }, 500);
      try {
        payload = {
          ...payload,
          idempotencyKey: `nfce-venda-${venda.id}`,
          naturezaOperacao: 'VENDA AO CONSUMIDOR',
          serie: configFiscal?.serie_nfce ?? 1,
          dataEmissao: new Date().toISOString(),
          consumidorFinal: 1,
          pagamentos: pagamentosToNFCe(pagamentos ?? [], payload.valorTotal),
        } satisfies NFCeEmitPayload;
      } catch (err) {
        if (err instanceof VendaMapperError) {
          return json({ error: 'payment_validation_failed', issues: err.issues, message: err.message }, 422);
        }
        throw err;
      }
    }

    // 3) Insere documento em status "processando" (idempotente por chave)
    const idempotencyKey = payload.idempotencyKey;
    const { data: docExistente } = await client
      .from('fiscal_documentos_eletronicos')
      .select('id, status')
      .eq('empresa_representada_id', venda.empresa_representada_id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    const statusExistente = String(docExistente?.status ?? '').toUpperCase();
    if (docExistente && ['AUTORIZADA', 'EM_PROCESSAMENTO'].includes(statusExistente)) {
      return json({
        error: 'duplicate_emission',
        message: `Já existe ${tipo === 'NFCE' ? 'NFC-e' : 'NF-e'} em processamento ou autorizada para esta venda.`,
        documento_id: docExistente.id,
      }, 409);
    }

    const tax = (base: number, aliquota: number) => Math.round(base * aliquota) / 100;
    const totalTributo = (field: 'aliquotaIcms' | 'aliquotaPis' | 'aliquotaCofins') =>
      payload.itens.reduce((total, item) => total + tax(item.valorTotal, item[field]), 0);
    const docBase = {
      empresa_representada_id: venda.empresa_representada_id,
      venda_id: venda.id,
      cliente_id: venda.cliente_id,
      tipo,
      modelo: tipo === 'NFCE' ? 65 : 55,
      serie: payload.serie,
      ambiente: environment === 'production' ? 'PRODUCAO' : 'HOMOLOGACAO',
      data_emissao: payload.dataEmissao,
      valor_produtos: payload.valorTotal,
      valor_frete: 0,
      valor_desconto: 0,
      valor_outras_despesas: 0,
      valor_total: payload.valorTotal,
      valor_icms: totalTributo('aliquotaIcms'),
      valor_icms_st: 0,
      valor_ipi: 0,
      valor_pis: totalTributo('aliquotaPis'),
      valor_cofins: totalTributo('aliquotaCofins'),
      status: 'EM_PROCESSAMENTO',
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

    const { error: snapshotDeleteErr } = await client
      .from('fiscal_documentos_eletronicos_itens')
      .delete()
      .eq('documento_id', documentoId);
    if (snapshotDeleteErr) return json({ error: 'snapshot_delete_failed', details: snapshotDeleteErr.message }, 500);
    const { error: snapshotInsertErr } = await client
      .from('fiscal_documentos_eletronicos_itens')
      .insert(payload.itens.map((item, index) => ({
        empresa_representada_id: venda.empresa_representada_id,
        documento_id: documentoId,
        produto_id: itens?.[index]?.produto_id,
        ordem: index + 1,
        descricao: item.descricao,
        ncm: item.ncm,
        cfop: item.cfop,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.valorTotal,
        origem_mercadoria: item.origem,
        icms_cst: item.icmsSituacaoTributaria,
        icms_base: item.valorTotal,
        icms_aliquota: item.aliquotaIcms,
        icms_valor: tax(item.valorTotal, item.aliquotaIcms),
        pis_cst: item.pisSituacaoTributaria,
        pis_aliquota: item.aliquotaPis,
        pis_valor: tax(item.valorTotal, item.aliquotaPis),
        cofins_cst: item.cofinsSituacaoTributaria,
        cofins_aliquota: item.aliquotaCofins,
        cofins_valor: tax(item.valorTotal, item.aliquotaCofins),
        dados_fiscais: {
          ibs_cbs_situacao_tributaria: item.ibsCbsSituacaoTributaria,
          ibs_cbs_classificacao_tributaria: item.ibsCbsClassificacaoTributaria,
          ibs_uf_aliquota: item.aliquotaIbsUf,
          ibs_uf_valor: tax(item.valorTotal, item.aliquotaIbsUf),
          ibs_mun_aliquota: item.aliquotaIbsMunicipio,
          ibs_mun_valor: tax(item.valorTotal, item.aliquotaIbsMunicipio),
          cbs_aliquota: item.aliquotaCbs,
          cbs_valor: tax(item.valorTotal, item.aliquotaCbs),
        },
      })));
    if (snapshotInsertErr) return json({ error: 'snapshot_insert_failed', details: snapshotInsertErr.message }, 500);

    // 4) Chama provider (mockado por padrão)
    let result: NFeEmitResult;
    let provider: ReturnType<typeof resolveFiscalProvider> | null = null;
    try {
      if (useMock) {
        result = mockEmitResult(idempotencyKey);
        console.log('[fiscal-emitir-nfe] MOCK ativo — nenhuma chamada real ao provedor.');
      } else {
        provider = resolveFiscalProvider(providerName, environment);
        result = tipo === 'NFCE'
          ? await provider.emitNFCe(payload as NFCeEmitPayload)
          : await provider.emitNFe(payload);
      }
    } catch (err) {
      const message = (err as Error).message ?? 'erro desconhecido';
      await client
        .from('fiscal_documentos_eletronicos')
        .update({ status: 'REJEITADA', motivo_rejeicao: message })
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

    // 5) Fase 3: baixar XML/DANFE do provedor e subir para Storage (apenas em modo real).
    //    Em modo mock mantemos as URLs mock:// que o UI já sabe rejeitar.
    let xmlStoragePath: string | undefined;
    let danfeStoragePath: string | undefined;
    if (!useMock && provider && result.status === 'autorizada') {
      try {
        const admin = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } },
        );
        const baseName = result.chaveAcesso ?? result.providerRef ?? documentoId;
        const yyyymm = new Date().toISOString().slice(0, 7); // YYYY-MM
        const dirPrefix = `${venda.empresa_representada_id}/${yyyymm}`;

        if (provider.downloadXml && result.xmlUrl) {
          const xml = await provider.downloadXml(result.xmlUrl);
          xmlStoragePath = `${dirPrefix}/${baseName}.xml`;
          const { error: upErr } = await admin.storage
            .from('fiscal-xml')
            .upload(xmlStoragePath, xml.content, {
              contentType: xml.contentType,
              upsert: true,
            });
          if (upErr) {
            console.error('[fiscal-emitir-nfe] upload XML falhou', upErr);
            xmlStoragePath = undefined;
          }
        }

        if (provider.downloadDanfe && result.danfeUrl) {
          const danfe = await provider.downloadDanfe(result.danfeUrl);
          danfeStoragePath = `${dirPrefix}/${baseName}.pdf`;
          const { error: upErr } = await admin.storage
            .from('fiscal-danfe')
            .upload(danfeStoragePath, danfe.content, {
              contentType: danfe.contentType,
              upsert: true,
            });
          if (upErr) {
            console.error('[fiscal-emitir-nfe] upload DANFE falhou', upErr);
            danfeStoragePath = undefined;
          }
        }
      } catch (err) {
        // Falha no download/upload não invalida a autorização — só loga.
        console.error('[fiscal-emitir-nfe] falha ao arquivar XML/DANFE', err);
      }
    }

    // 6) Persiste resultado + evento
    await client
      .from('fiscal_documentos_eletronicos')
      .update({
        status: toDocumentoStatus(result.status),
        provider_ref: result.providerRef,
        chave_acesso: result.chaveAcesso,
        protocolo_autorizacao: result.protocoloAutorizacao,
        codigo_status_sefaz: result.codigoStatusSefaz,
        motivo_rejeicao: result.motivoRejeicao,
        xml_url: xmlStoragePath ?? result.xmlUrl,
        danfe_url: danfeStoragePath ?? result.danfeUrl,
        pdf_danfe_url: danfeStoragePath ?? result.danfeUrl,
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

    if (useMock) {
      console.log('[fiscal-emitir-nfe] MOCK: pulando upload real de XML/DANFE.');
    }


    return json({
      ok: true,
      documento_id: documentoId,
      status: result.status,
      provider_ref: result.providerRef,
      chave_acesso: result.chaveAcesso,
      xml_url: xmlStoragePath ?? result.xmlUrl,
      danfe_url: danfeStoragePath ?? result.danfeUrl,
      xml_bucket: xmlStoragePath ? 'fiscal-xml' : undefined,
      danfe_bucket: danfeStoragePath ? 'fiscal-danfe' : undefined,
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
    status: 'autorizada',
    providerRef: ref,
    chaveAcesso: chaveMock,
    protocoloAutorizacao: `MOCK-AUT-${Date.now()}`,
    codigoStatusSefaz: '100',
    motivoRejeicao: undefined,
    xmlUrl: `mock://fiscal-xml/${ref}.xml`,
    danfeUrl: `mock://fiscal-danfe/${ref}.pdf`,
    raw: { mock: true, ref },
  };
}

function toDocumentoStatus(status: string): string {
  const normalized = status.toLowerCase();
  const map: Record<string, string> = {
    processando: 'EM_PROCESSAMENTO',
    autorizada: 'AUTORIZADA',
    rejeitada: 'REJEITADA',
    cancelada: 'CANCELADA',
    encerrada: 'ENCERRADA',
    denegada: 'DENEGADA',
    inutilizada: 'INUTILIZADA',
    erro: 'REJEITADA',
  };
  return map[normalized] ?? status.toUpperCase();
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
