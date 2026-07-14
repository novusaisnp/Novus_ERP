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
    body = (await req.json()) as SmokeRequest;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body?.vendaId) return json({ error: 'invalid_input', missing: ['vendaId'] }, 400);

  // Preserva a estrutura de auth para as chamadas internas.
  const invoke = async (fn: string, payload: Record<string, unknown>): Promise<StepResult> => {
    const t0 = Date.now();
    try {
      const { data, error } = await client.functions.invoke(fn, { body: payload });
      const latency = Date.now() - t0;
      if (error) {
        return { step: fn, ok: false, error: error.message, status: `latency_ms=${latency}` };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      return {
        step: fn,
        ok: true,
        status: d?.status ?? 'ok',
        documento_id: d?.documento_id ?? d?.documentoId,
      };
    } catch (err) {
      return { step: fn, ok: false, error: (err as Error).message };
    }
  };

  const results: StepResult[] = [];

  // 1) Emitir
  const r1 = await invoke('fiscal-emitir-nfe', { vendaId: body.vendaId });
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

  return json({ ok: true, step: 'done', vendaId: body.vendaId, documento_id: documentoId, results }, 200);
});
