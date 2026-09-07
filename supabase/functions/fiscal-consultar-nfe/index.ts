import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { hasEveryPermission } from '../_shared/permissions.ts';
import { resolveFiscalProvider } from '../_shared/fiscal/providers/resolveFiscalProvider.ts';
import type { FiscalEnvironment, FiscalProviderName } from '../_shared/fiscal/providers/FiscalProvider.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    if (!await hasEveryPermission(client, userData.user.id, ['fiscal.read'])) {
      return json({ error: 'forbidden' }, 403);
    }

    const { documentoId } = await req.json() as { documentoId?: string };
    if (!documentoId) return json({ error: 'invalid_input', missing: ['documentoId'] }, 400);
    const { data: doc, error: docErr } = await client
      .from('fiscal_documentos_eletronicos')
      .select('id, empresa_representada_id, tipo, status, provider, provider_ref, ambiente')
      .eq('id', documentoId)
      .maybeSingle();
    if (docErr || !doc) return json({ error: 'documento_not_found' }, 404);
    if ((Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false') {
      return json({ ok: true, status: String(doc.status).toLowerCase(), mock: true }, 200);
    }
    if (!doc.provider_ref) return json({ error: 'provider_ref_missing' }, 409);

    const provider = resolveFiscalProvider(
      (doc.provider ?? 'focusnfe') as FiscalProviderName,
      (doc.ambiente === 'PRODUCAO' ? 'production' : 'homologation') as FiscalEnvironment,
    );
    const result = doc.tipo === 'NFCE'
      ? await provider.consultNFCeStatus(doc.provider_ref)
      : doc.tipo === 'MDFE'
        ? await provider.consultMDFeStatus(doc.provider_ref)
        : await provider.consultNFeStatus(doc.provider_ref);
    const status = toDocumentoStatus(result.status);
    let xmlUrl = result.xmlUrl;
    let danfeUrl = result.danfeUrl;
    if (result.status === 'autorizada') {
      try {
        const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
        const prefix = `${doc.empresa_representada_id}/${new Date().toISOString().slice(0, 7)}`;
        const baseName = result.chaveAcesso || doc.provider_ref;
        if (provider.downloadXml && result.xmlUrl) {
          const file = await provider.downloadXml(result.xmlUrl);
          const path = `${prefix}/${baseName}.xml`;
          const { error } = await admin.storage.from('fiscal-xml').upload(path, file.content, { contentType: file.contentType, upsert: true });
          if (!error) xmlUrl = path;
        }
        if (provider.downloadDanfe && result.danfeUrl) {
          const file = await provider.downloadDanfe(result.danfeUrl);
          const path = `${prefix}/${baseName}.pdf`;
          const { error } = await admin.storage.from('fiscal-danfe').upload(path, file.content, { contentType: file.contentType, upsert: true });
          if (!error) danfeUrl = path;
        }
      } catch (err) {
        console.error('[fiscal-consultar-nfe] falha ao arquivar XML/DANFE', err);
      }
    }
    const { error: updateErr } = await client
      .from('fiscal_documentos_eletronicos')
      .update({
        status,
        chave_acesso: result.chaveAcesso,
        protocolo_autorizacao: result.protocoloAutorizacao,
        codigo_status_sefaz: result.codigoStatusSefaz,
        motivo_rejeicao: result.motivo,
        xml_url: xmlUrl,
        danfe_url: danfeUrl,
        pdf_danfe_url: danfeUrl,
        payload_provedor: result.raw,
      })
      .eq('id', doc.id);
    if (updateErr) return json({ error: 'db_update_failed', details: updateErr.message }, 500);

    if (status !== doc.status) {
      await client.from('fiscal_eventos').insert({
        empresa_representada_id: doc.empresa_representada_id,
        documento_id: doc.id,
        tipo: result.status === 'encerrada' ? 'encerramento' : result.status === 'autorizada' ? 'autorizacao' : 'processamento',
        status: result.status,
        protocolo: result.protocoloAutorizacao,
        motivo_rejeicao: result.motivo,
        payload_provedor: result.raw,
        created_by: userData.user.id,
      });
    }
    return json({ ok: true, status: result.status, mock: false }, 200);
  } catch (err) {
    console.error('[fiscal-consultar-nfe] erro', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function toDocumentoStatus(status: string): string {
  return ({
    processando: 'EM_PROCESSAMENTO', autorizada: 'AUTORIZADA', rejeitada: 'REJEITADA',
    cancelada: 'CANCELADA', denegada: 'DENEGADA', inutilizada: 'INUTILIZADA', erro: 'REJEITADA',
    encerrada: 'ENCERRADA',
  } as Record<string, string>)[status] ?? status.toUpperCase();
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
