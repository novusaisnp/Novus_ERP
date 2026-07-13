// e2e-reset — reset transacional restrito ao tenant E2E.
// Guardas obrigatórios:
// 1. E2E_ENABLED === 'true'
// 2. tenantName informado começa com 'E2E'
// 3. empresa localizada no DB tem nome LIKE 'E2E%'
// Sem os três, retorna 403 sem executar qualquer DELETE.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface ResetBody {
  tenantName?: string;
}

interface ResetResponse {
  ok: boolean;
  message: string;
  tenantId?: string;
  tablesTruncated?: string[];
}

// Tabelas transacionais escopadas por empresa_representada_id.
// NÃO inclui tabelas mestre (bancos, produtos, plano_contas etc.) —
// essas são reutilizadas entre execuções.
const TRANSACTIONAL_TABLES = [
  'venda_pagamento_parcelas',
  'venda_pagamento',
  'itens_venda',
  'vendas',
  'orcamentos_venda_itens',
  'orcamentos_venda',
  'liquidacoes_titulos',
  'contas_receber',
  'contas_pagar',
  'movimentacoes_bancarias',
  'banco_movimentacoes_extrato',
  'banco_extratos_importados',
  'estoque_movimentacoes',
  'estoque_saldos',
] as const;

function jsonResponse(body: ResetResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Guard 1 — feature flag
  if (Deno.env.get('E2E_ENABLED') !== 'true') {
    return jsonResponse({ ok: false, message: 'E2E reset disabled (E2E_ENABLED != true)' }, 403);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
  }

  let body: ResetBody = {};
  try {
    body = (await req.json()) as ResetBody;
  } catch {
    body = {};
  }

  const tenantName = (body.tenantName ?? '').trim();

  // Guard 2 — nome do tenant DEVE começar com E2E
  if (!tenantName.startsWith('E2E')) {
    return jsonResponse(
      { ok: false, message: 'tenantName must start with "E2E"' },
      400,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ ok: false, message: 'Server misconfigured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Guard 3 — empresa deve existir e ter nome LIKE 'E2E%'
  const { data: empresa, error: empresaErr } = await admin
    .from('empresas_representadas')
    .select('id, nome')
    .ilike('nome', 'E2E%')
    .eq('nome', tenantName)
    .maybeSingle();

  if (empresaErr || !empresa) {
    return jsonResponse(
      { ok: false, message: `Tenant not found or not an E2E tenant: ${tenantName}` },
      404,
    );
  }

  const truncated: string[] = [];
  for (const table of TRANSACTIONAL_TABLES) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq('empresa_representada_id', empresa.id);
    if (!error) {
      truncated.push(table);
    } else {
      console.error(`[e2e-reset] erro em ${table}:`, error.message);
    }
  }

  return jsonResponse(
    {
      ok: true,
      message: `Reset concluído para ${empresa.nome}`,
      tenantId: empresa.id,
      tablesTruncated: truncated,
    },
    200,
  );
});
