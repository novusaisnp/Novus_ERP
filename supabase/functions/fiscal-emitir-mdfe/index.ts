import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { hasEveryPermission } from '../_shared/permissions.ts';
import { emitirMDFeSchema, mdfeToFocusPayload } from '../_shared/fiscal/mappers/mdfeToFocusPayload.ts';
import { resolveFiscalProvider } from '../_shared/fiscal/providers/resolveFiscalProvider.ts';
import type { FiscalEnvironment, NFeEmitResult } from '../_shared/fiscal/providers/FiscalProvider.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    if (!await hasEveryPermission(client, userData.user.id, ['fiscal.create'])) {
      return json({ error: 'forbidden' }, 403);
    }

    const parsed = emitirMDFeSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'invalid_input', issues: parsed.error.flatten() }, 422);
    const input = parsed.data;
    const idempotencyKey = `mdfe-${input.idempotencyKey}`;
    const { data: existing } = await client.from('fiscal_documentos_eletronicos')
      .select('id,status').eq('empresa_representada_id', input.empresaId).eq('idempotency_key', idempotencyKey).maybeSingle();
    if (existing) return json({ error: 'duplicate_emission', documento_id: existing.id, status: existing.status }, 409);

    const [{ data: config }, { data: empresa }, { data: documentos, error: docsErr }] = await Promise.all([
      client.from('fiscal_configuracoes')
        .select('ambiente,provedor,serie_mdfe,rntrc,cnpj_emitente,inscricao_estadual')
        .eq('empresa_representada_id', input.empresaId).eq('ativo', true).is('deleted_at', null).maybeSingle(),
      client.from('empresas_representadas').select('id,cnpj').eq('id', input.empresaId).maybeSingle(),
      client.from('fiscal_documentos_eletronicos').select('id,chave_acesso,valor_total')
        .eq('empresa_representada_id', input.empresaId).eq('tipo', 'NFE').eq('status', 'AUTORIZADA').in('id', input.documentoIds),
    ]);
    if (!config || !empresa) return json({ error: 'fiscal_config_missing' }, 422);
    if (docsErr || !documentos || documentos.length !== input.documentoIds.length || documentos.some(d => !/^\d{44}$/.test(d.chave_acesso ?? ''))) {
      return json({ error: 'documentos_invalidos', message: 'Use somente NF-e autorizadas, com chave de 44 dígitos, da empresa ativa.' }, 422);
    }
    const { data: linksExistentes } = await client.from('fiscal_mdfe_documentos')
      .select('operacao_id').eq('empresa_representada_id', input.empresaId).in('documento_fiscal_id', input.documentoIds);
    if (linksExistentes?.length) {
      const { data: operacoesAtivas } = await client.from('fiscal_mdfe_operacoes').select('id,status')
        .in('id', [...new Set(linksExistentes.map(link => link.operacao_id))]);
      if (operacoesAtivas?.some(op => !['CANCELADA', 'ENCERRADA'].includes(op.status))) {
        return json({ error: 'documento_ja_manifestado', message: 'Uma NF-e selecionada já pertence a MDF-e ativo.' }, 409);
      }
    }
    const cnpj = String(config.cnpj_emitente ?? empresa.cnpj ?? '').replace(/\D/g, '');
    const ie = String(config.inscricao_estadual ?? '').trim();
    const rntrc = String(config.rntrc ?? '').replace(/\D/g, '');
    if (cnpj.length !== 14 || !ie || rntrc.length !== 8) return json({ error: 'mdfe_config_incomplete' }, 422);

    const body = mdfeToFocusPayload(input, {
      cnpj, inscricaoEstadual: ie, serie: config.serie_mdfe ?? 1, rntrc,
    }, documentos.map(d => ({ id: d.id, chave: d.chave_acesso! })));
    const environment: FiscalEnvironment = config.ambiente === 'PRODUCAO' ? 'production' : 'homologation';
    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';

    const { data: operacao, error: opErr } = await client.from('fiscal_mdfe_operacoes').insert({
      empresa_representada_id: input.empresaId, emitente_tipo: input.emitenteTipo,
      transportador_tipo: input.transportadorTipo, uf_inicio: input.ufInicio.toUpperCase(), uf_fim: input.ufFim.toUpperCase(),
      municipios_carregamento: [input.municipioCarregamento], percursos: input.percursos,
      municipios_descarregamento: [input.municipioDescarregamento],
      data_hora_previsto_inicio_viagem: input.dataHoraPrevistoInicioViagem,
      valor_total_carga: input.valorTotalCarga, peso_bruto: input.pesoBruto, unidade_peso: input.unidadePeso,
      tipo_carga: input.tipoCarga, descricao_produto_predominante: input.descricaoProduto,
      ncm_produto_predominante: input.ncmProduto, veiculo_tracao: input.veiculo,
      condutores: input.condutores, seguros_carga: [input.seguro], status: 'EM_PROCESSAMENTO', created_by: userData.user.id,
    }).select('id').single();
    if (opErr || !operacao) return json({ error: 'operacao_insert_failed', details: opErr?.message }, 500);

    const { data: doc, error: docErr } = await client.from('fiscal_documentos_eletronicos').insert({
      empresa_representada_id: input.empresaId, tipo: 'MDFE', modelo: 58, serie: config.serie_mdfe ?? 1,
      ambiente: environment === 'production' ? 'PRODUCAO' : 'HOMOLOGACAO', data_emissao: new Date().toISOString(),
      valor_produtos: input.valorTotalCarga, valor_total: input.valorTotalCarga, status: 'EM_PROCESSAMENTO',
      provider: 'focusnfe', idempotency_key: idempotencyKey, created_by: userData.user.id, tentativas: 1,
      ultima_tentativa_at: new Date().toISOString(),
    }).select('id').single();
    if (docErr || !doc) return json({ error: 'documento_insert_failed', details: docErr?.message }, 500);
    await client.from('fiscal_mdfe_operacoes').update({ documento_id: doc.id }).eq('id', operacao.id);
    const { error: linksErr } = await client.from('fiscal_mdfe_documentos').insert(documentos.map(d => ({
      empresa_representada_id: input.empresaId, operacao_id: operacao.id, documento_fiscal_id: d.id,
      tipo: 'NFE', chave_acesso: d.chave_acesso,
      codigo_municipio_descarregamento: input.municipioDescarregamento.codigo,
      nome_municipio_descarregamento: input.municipioDescarregamento.nome,
    })));
    if (linksErr) {
      await client.from('fiscal_documentos_eletronicos').update({ status: 'REJEITADA', motivo_rejeicao: linksErr.message }).eq('id', doc.id);
      await client.from('fiscal_mdfe_operacoes').update({ status: 'REJEITADA' }).eq('id', operacao.id);
      return json({ error: 'documentos_link_failed', details: linksErr.message, documento_id: doc.id }, 500);
    }

    let result: NFeEmitResult;
    try {
      result = useMock ? {
        status: 'autorizada', providerRef: idempotencyKey, protocoloAutorizacao: `MOCK-MDFE-${Date.now()}`,
        chaveAcesso: `51${Date.now().toString().padStart(42, '0').slice(-42)}`, raw: { mock: true },
      } : await resolveFiscalProvider('focusnfe', environment).emitMDFe({ idempotencyKey, body });
    } catch (err) {
      const message = (err as Error).message;
      await client.from('fiscal_documentos_eletronicos').update({ status: 'REJEITADA', motivo_rejeicao: message }).eq('id', doc.id);
      await client.from('fiscal_mdfe_operacoes').update({ status: 'REJEITADA' }).eq('id', operacao.id);
      return json({ error: 'provider_error', message, documento_id: doc.id }, 502);
    }
    const status = result.status === 'autorizada' ? 'AUTORIZADA' : result.status === 'rejeitada' ? 'REJEITADA' : 'EM_PROCESSAMENTO';
    await client.from('fiscal_documentos_eletronicos').update({
      status, provider_ref: result.providerRef, chave_acesso: result.chaveAcesso,
      protocolo_autorizacao: result.protocoloAutorizacao, codigo_status_sefaz: result.codigoStatusSefaz,
      motivo_rejeicao: result.motivoRejeicao, payload_provedor: result.raw,
    }).eq('id', doc.id);
    await client.from('fiscal_mdfe_operacoes').update({ status }).eq('id', operacao.id);
    await client.from('fiscal_eventos').insert({
      empresa_representada_id: input.empresaId, documento_id: doc.id,
      tipo: result.status === 'autorizada' ? 'autorizacao' : 'processamento', status: result.status,
      protocolo: result.protocoloAutorizacao, payload_provedor: result.raw, created_by: userData.user.id,
    });
    return json({ ok: true, documento_id: doc.id, operacao_id: operacao.id, status: result.status, mock: useMock }, 200);
  } catch (err) {
    console.error('[fiscal-emitir-mdfe] erro', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
