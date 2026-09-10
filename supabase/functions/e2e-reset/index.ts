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
  errors?: Array<{ table: string; message: string }>;
}

// Tabelas transacionais escopadas por empresa_representada_id, em ordem de
// dependência (filha antes da mãe) — verificado contra os FKs reais via
// information_schema. A ordem importa: várias dessas FKs são NO ACTION (não
// CASCADE), e um DELETE fora de ordem falha silenciosamente sem abortar o
// reset (só loga no servidor), deixando linhas órfãs acumulando entre
// execuções. Achado real: `vendas`/`venda_pagamento` vinham antes de
// `contas_receber` na lista antiga — com `contas_receber.venda_id` e
// `.venda_pagamento_id` sendo NO ACTION, cada reset falhava em apagar
// `vendas`/`venda_pagamento` sempre que já existia algum título gerado,
// acumulando vendas "fantasma" de execuções anteriores.
// NÃO inclui tabelas mestre (bancos, produtos, plano_contas etc.) —
// essas são reutilizadas entre execuções.
const TRANSACTIONAL_TABLES = [
  'movimentacoes_bancarias', // filha de liquidacoes_titulos (NO ACTION)
  'liquidacoes_titulos', // filha de contas_receber/contas_pagar (NO ACTION)
  'contas_receber', // filha de vendas/venda_pagamento/venda_pagamento_parcelas (NO ACTION)
  'contas_pagar',
  'venda_pagamento_parcelas', // filha de venda_pagamento (CASCADE, mas contas_receber acima referenciava ela também)
  'venda_pagamento', // filha de vendas (CASCADE)
  'itens_venda', // filha de vendas (CASCADE)
  'vendas',
  'orcamentos_venda_itens',
  'orcamentos_venda',
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
  const errors: Array<{ table: string; message: string }> = [];
  for (const table of TRANSACTIONAL_TABLES) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq('empresa_representada_id', empresa.id);
    if (!error) {
      truncated.push(table);
    } else {
      console.error(`[e2e-reset] erro em ${table}:`, error.message);
      errors.push({ table, message: error.message });
    }
  }

  return jsonResponse(
    {
      ok: errors.length === 0,
      message: errors.length === 0
        ? `Reset concluído para ${empresa.nome}`
        : `Reset parcial para ${empresa.nome}: ${errors.length} tabela(s) falharam`,
      tenantId: empresa.id,
      tablesTruncated: truncated,
      errors,
    },
    200,
  );
});
