import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { hasEveryPermission } from '../_shared/permissions.ts';
import { z } from 'https://esm.sh/zod@3.23.8';
import { resolveFiscalProvider } from '../_shared/fiscal/providers/resolveFiscalProvider.ts';
import type { FiscalEnvironment, FiscalProviderName } from '../_shared/fiscal/providers/FiscalProvider.ts';

const schema = z.discriminatedUnion('acao', [
  z.object({ documentoId: z.string().uuid(), acao: z.literal('encerrar'), data: z.string().date(), uf: z.string().length(2), municipio: z.string().min(2).max(60) }),
  z.object({ documentoId: z.string().uuid(), acao: z.literal('incluir_condutor'), nome: z.string().min(2).max(60), cpf: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 11) }),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
    if (!await hasEveryPermission(client, userData.user.id, ['fiscal.update'])) {
      return json({ error: 'forbidden' }, 403);
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'invalid_input', issues: parsed.error.flatten() }, 422);
    const input = parsed.data;
    const { data: doc } = await client.from('fiscal_documentos_eletronicos')
      .select('id,empresa_representada_id,tipo,status,provider,provider_ref,ambiente').eq('id', input.documentoId).maybeSingle();
    if (!doc || doc.tipo !== 'MDFE') return json({ error: 'mdfe_not_found' }, 404);
    if (doc.status !== 'AUTORIZADA') return json({ error: 'invalid_status', message: `MDF-e deve estar AUTORIZADA (atual: ${doc.status}).` }, 409);
    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';
    if (!useMock && !doc.provider_ref) return json({ error: 'provider_ref_missing' }, 409);
    const provider = useMock ? null : resolveFiscalProvider(
      (doc.provider ?? 'focusnfe') as FiscalProviderName,
      (doc.ambiente === 'PRODUCAO' ? 'production' : 'homologation') as FiscalEnvironment,
    );
    const result = input.acao === 'encerrar'
      ? provider ? await provider.closeMDFe(doc.provider_ref!, input.data, input.uf.toUpperCase(), input.municipio) : { status: 'encerrada', raw: { mock: true } }
      : provider ? await provider.addMDFeDriver(doc.provider_ref!, input.nome, input.cpf) : { status: 'autorizada', raw: { mock: true } };
    const eventoTipo = input.acao === 'encerrar' ? 'encerramento' : 'inclusao_condutor';
    if (input.acao === 'encerrar' && result.status !== 'encerrada') return json({ error: 'encerramento_nao_confirmado', status: result.status }, 502);
    if (input.acao === 'encerrar') {
      await client.from('fiscal_documentos_eletronicos').update({ status: 'ENCERRADA' }).eq('id', doc.id);
      await client.from('fiscal_mdfe_operacoes').update({ status: 'ENCERRADA' }).eq('documento_id', doc.id);
    }
    const raw = result.raw as Record<string, unknown>;
    const { data: evento, error: eventErr } = await client.from('fiscal_eventos').insert({
      empresa_representada_id: doc.empresa_representada_id, documento_id: doc.id, tipo: eventoTipo,
      status: result.status, protocolo: String(raw.protocolo ?? raw.protocolo_encerramento ?? ''),
      payload_provedor: result.raw, created_by: userData.user.id,
    }).select('id').single();
    if (eventErr) return json({ error: 'evento_insert_failed', details: eventErr.message }, 500);
    return json({ ok: true, status: result.status, evento_id: evento.id, mock: useMock }, 200);
  } catch (err) {
    console.error('[fiscal-evento-mdfe] erro', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
