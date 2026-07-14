// Edge Function: fiscal-smoke-run
//
// Executa o ciclo completo emitir → cce → cancelar em modo mock para uma
// venda faturada. Admin-only. Reaproveita as edge functions existentes via
// supabase.functions.invoke, mantendo toda a lógica de negócio centralizada
// nelas.
//
// Uso a partir da UI (DashboardFiscal) ou via curl:
//   POST /functions/v1/fiscal-smoke-run { "vendaId": "<uuid>" }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface SmokeRequest {
  vendaId: string;
}

interface StepResult {
  step: string;
  ok: boolean;
  status?: string;
  error?: string;
  documento_id?: string;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
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

  let body: SmokeRequest;
  try {
    body = (await req.json().catch(() => ({}))) as SmokeRequest;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Resolve vendaId: usa o informado ou auto-seleciona a última venda "faturada".
  let vendaId = body?.vendaId?.trim();
  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const pickFaturada = async (): Promise<{ id?: string; error?: string }> => {
    const { data, error } = await client
      .from('vendas')
      .select('id')
      .eq('status', 'faturada')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data?.id) return { error: 'nenhuma venda com status=faturada disponível para smoke test' };
    return { id: data.id };
  };

  if (!vendaId) {
    const pick = await pickFaturada();
    if (pick.error) return json({ error: 'no_venda_available', message: pick.error }, 404);
    vendaId = pick.id!;
  } else {
    if (!isUuid(vendaId)) return json({ error: 'invalid_venda_id', message: 'vendaId não é um UUID válido' }, 400);
    const { data: exists } = await client.from('vendas').select('id, status').eq('id', vendaId).maybeSingle();
    if (!exists) {
      const pick = await pickFaturada();
      if (pick.error) {
        return json({ error: 'venda_not_found', message: `venda ${vendaId} não existe e não há vendas faturadas para fallback` }, 404);
      }
      console.log(`[fiscal-smoke-run] venda ${vendaId} não encontrada — usando fallback ${pick.id}`);
      vendaId = pick.id!;
    }
  }


  // Chama sub-função via fetch direto para conseguirmos ler o body do erro
  // (supabase.functions.invoke esconde o body quando o status é não-2xx).
  const invoke = async (fn: string, payload: Record<string, unknown>): Promise<StepResult> => {
    const t0 = Date.now();
    const url = `${supabaseUrl}/functions/v1/${fn}`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const latency = Date.now() - t0;
      const text = await resp.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parsed: any = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { /* not json */ }
      if (!resp.ok) {
        return {
          step: fn,
          ok: false,
          error: parsed?.error ?? parsed?.message ?? text.slice(0, 500) ?? `HTTP ${resp.status}`,
          status: `http=${resp.status} latency_ms=${latency}`,
        };
      }
      return {
        step: fn,
        ok: true,
        status: parsed?.status ?? 'ok',
        documento_id: parsed?.documento_id ?? parsed?.documentoId,
      };
    } catch (err) {
      return { step: fn, ok: false, error: (err as Error).message };
    }
  };

  const results: StepResult[] = [];

  // 1) Emitir
  const r1 = await invoke('fiscal-emitir-nfe', { vendaId: vendaId });
  results.push(r1);
  if (!r1.ok) return json({ ok: false, step: 'emitir', results }, 502);

  // Aguarda pequena janela para permitir replicação/realtime.
  await new Promise((r) => setTimeout(r, 400));

  const documentoId = r1.documento_id;

  // 2) CC-e (carta de correção)
  if (documentoId) {
    const r2 = await invoke('fiscal-cce-nfe', {
      documentoId,
      correcao: 'Correção automática gerada pelo smoke-mock — dado de teste.',
    });
    results.push(r2);
  }

  // 3) Cancelar
  if (documentoId) {
    const r3 = await invoke('fiscal-cancelar-nfe', {
      documentoId,
      justificativa: 'Cancelamento automático gerado pelo smoke-mock (>=15 chars).',
    });
    results.push(r3);
  }

  return json({ ok: true, step: 'done', vendaId: vendaId, documento_id: documentoId, results }, 200);
});
