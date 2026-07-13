// e2e-set-venda-status — transiciona status de uma venda no tenant E2E.
// Guardas:
// 1. E2E_ENABLED === 'true'
// 2. Venda pertence a empresa com nome LIKE 'E2E%'
// 3. Status alvo dentro do enum válido.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  vendaId?: string;
  status?: string;
}

const STATUS_VALIDOS = ['RASCUNHO', 'CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE', 'CANCELADO'];

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (Deno.env.get('E2E_ENABLED') !== 'true') {
    return json({ ok: false, message: 'E2E disabled' }, 403);
  }
  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed' }, 405);

  let body: Body = {};
  try { body = await req.json() as Body; } catch { /* ignore */ }

  const vendaId = (body.vendaId ?? '').trim();
  const status = (body.status ?? '').trim().toUpperCase();

  if (!vendaId) return json({ ok: false, message: 'vendaId required' }, 400);
  if (!STATUS_VALIDOS.includes(status)) return json({ ok: false, message: 'invalid status' }, 400);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ ok: false, message: 'Server misconfigured' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Guard: venda -> empresa E2E
  const { data: venda, error: vErr } = await admin
    .from('vendas')
    .select('id, empresa_representada_id, empresas_representadas:empresa_representada_id(nome)')
    .eq('id', vendaId)
    .maybeSingle();

  if (vErr || !venda) return json({ ok: false, message: 'venda not found' }, 404);
  const empresaNome = (venda as { empresas_representadas?: { nome?: string } }).empresas_representadas?.nome ?? '';
  if (!empresaNome.startsWith('E2E')) {
    return json({ ok: false, message: 'venda not in E2E tenant' }, 403);
  }

  const { error: uErr } = await admin
    .from('vendas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', vendaId);

  if (uErr) return json({ ok: false, message: uErr.message }, 500);

  return json({ ok: true, vendaId, status }, 200);
});
