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
import { hasEveryPermission } from '../_shared/permissions.ts';

interface SmokeRequest {
  vendaId?: string;
}

interface VendaSmokeCandidate {
  id: string;
  numero_venda: string | null;
  status: string | null;
  cliente_id?: string | null;
  empresa_representada_id?: string | null;
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

  if (!await hasEveryPermission(client, userData.user.id, [
    'fiscal.create',
    'fiscal.cartaCorrecao',
    'fiscal.cancelarNfe',
  ])) return json({ error: 'forbidden' }, 403);

  let body: SmokeRequest;
  try {
    body = (await req.json().catch(() => ({}))) as SmokeRequest;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Resolve vendaId: usa UUID informado, número da venda informado ou auto-seleciona
  // a última venda em status fiscalmente elegível. O cadastro de vendas usa status
  // em caixa alta (ex.: CONFIRMADO/FATURADO), não o texto legado "faturada".
  let vendaId = body?.vendaId?.trim();
  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const eligibleStatuses = ['CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE'];
  const eligibleStatusValues = [...eligibleStatuses, ...eligibleStatuses.map((s) => s.toLowerCase())];

  const isEligible = (status?: string | null) => eligibleStatuses.includes((status ?? '').toUpperCase());

  const ensureSmokeFixture = async (): Promise<{ venda?: VendaSmokeCandidate; error?: string }> => {
    const { data: empresa, error: empresaErr } = await client
      .from('empresas_representadas')
      .select('id, cnpj, estado')
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (empresaErr) return { error: empresaErr.message };
    if (!empresa?.id || !empresa.cnpj || !empresa.estado) return { error: 'empresa ativa precisa de CNPJ e UF para o smoke fiscal' };

    const { error: configErr } = await client.from('fiscal_configuracoes').upsert({
      empresa_representada_id: empresa.id,
      regime_tributario: 'LUCRO_PRESUMIDO',
      ambiente: 'HOMOLOGACAO',
      provedor: 'FOCUS_NFE',
      cnpj_emitente: empresa.cnpj.replace(/\D/g, ''),
      inscricao_estadual: 'SMOKE-IE',
      serie_nfe: 1,
      ativo: true,
      deleted_at: null,
    }, { onConflict: 'empresa_representada_id' });
    if (configErr) return { error: configErr.message };

    const { data: clienteExistente, error: clienteSelectErr } = await client
      .from('entidades')
      .select('id')
      .eq('empresa_representada_id', empresa.id)
      .eq('nome', 'Cliente Fiscal Smoke Mock')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (clienteSelectErr) return { error: clienteSelectErr.message };

    let clienteId = clienteExistente?.id as string | undefined;
    const qualificacaoFiscal = { indicador_ie: '2', consumidor_final: true };
    if (!clienteId) {
      const { data: clienteNovo, error: clienteInsertErr } = await client
        .from('entidades')
        .insert({
          empresa_representada_id: empresa.id,
          tipo_pessoa: 'PJ',
          nome: 'Cliente Fiscal Smoke Mock',
          razao_social: 'Cliente Fiscal Smoke Mock Ltda',
          cnpj: '11222333000181',
          inscricao_estadual: 'ISENTO',
          email: 'fiscal-smoke@example.test',
          cep: '01001000',
          logradouro: 'Praca da Se',
          numero: '100',
          bairro: 'Se',
          cidade: 'Sao Paulo',
          estado: empresa.estado,
          qualificacao_fiscal: qualificacaoFiscal,
          ativo: true,
        })
        .select('id')
        .single();
      if (clienteInsertErr || !clienteNovo?.id) return { error: clienteInsertErr?.message ?? 'falha ao criar cliente fiscal mock' };
      clienteId = clienteNovo.id;
      await client
        .from('entidade_papeis')
        .insert({ entidade_id: clienteId, empresa_representada_id: empresa.id, papel: 'CLIENTE' });
    } else {
      await client.from('entidades').update({ qualificacao_fiscal: qualificacaoFiscal }).eq('id', clienteId);
    }

    const { data: produtoExistente } = await client
      .from('produtos')
      .select('id')
      .eq('empresa_representada_id', empresa.id)
      .eq('codigo', 'SMOKE-FISCAL')
      .limit(1)
      .maybeSingle();
    let produtoId = produtoExistente?.id as string | undefined;
    const dadosFiscaisSmoke = {
      icms_situacao_tributaria: '00', icms_aliquota: 18,
      pis_situacao_tributaria: '01', pis_aliquota: 1.65,
      cofins_situacao_tributaria: '01', cofins_aliquota: 7.6,
      ibs_cbs_situacao_tributaria: '000', ibs_cbs_classificacao_tributaria: '000001',
      ibs_uf_aliquota: 0.1, ibs_mun_aliquota: 0, cbs_aliquota: 0.9,
    };
    if (!produtoId) {
      const { data: produtoNovo, error: produtoErr } = await client.from('produtos').insert({
        empresa_representada_id: empresa.id,
        codigo: 'SMOKE-FISCAL',
        nome: 'Produto smoke fiscal mock',
        preco_venda: 1117.9,
        ncm: '49019900',
        origem_produto: '0',
        dados_fiscais: dadosFiscaisSmoke,
        ativo: true,
      }).select('id').single();
      if (produtoErr || !produtoNovo?.id) return { error: produtoErr?.message ?? 'falha ao criar produto fiscal mock' };
      produtoId = produtoNovo.id;
    } else {
      await client.from('produtos').update({ ncm: '49019900', origem_produto: '0', dados_fiscais: dadosFiscaisSmoke }).eq('id', produtoId);
    }

    const { data: vendaExistente, error: vendaSelectErr } = await client
      .from('vendas')
      .select('id, numero_venda, status, cliente_id, empresa_representada_id')
      .eq('numero_venda', 'SMOKE-MOCK')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    if (vendaSelectErr) return { error: vendaSelectErr.message };

    let venda = vendaExistente as VendaSmokeCandidate | null;
    if (!venda) {
      const { data: vendaNova, error: vendaInsertErr } = await client
        .from('vendas')
        .insert({
          empresa_representada_id: empresa.id,
          cliente_id: clienteId,
          numero_venda: 'SMOKE-MOCK',
          data_venda: new Date().toISOString().slice(0, 10),
          status: 'CONFIRMADO',
          origem: 'mock',
          canal_venda: 'fiscal-smoke',
          subtotal: 1117.9,
          valor_total: 1117.9,
          tipo: 'P',
          observacoes: 'Venda sintética criada automaticamente pelo smoke fiscal mock.',
        })
        .select('id, numero_venda, status, cliente_id, empresa_representada_id')
        .single();
      if (vendaInsertErr || !vendaNova?.id) return { error: vendaInsertErr?.message ?? 'falha ao criar venda fiscal mock' };
      venda = vendaNova as VendaSmokeCandidate;
    }

    const { count: itemCount, error: itemCountErr } = await client
      .from('itens_venda')
      .select('id', { count: 'exact', head: true })
      .eq('venda_id', venda.id);

    if (itemCountErr) return { error: itemCountErr.message };
    if ((itemCount ?? 0) === 0) {
      const { error: itemInsertErr } = await client.from('itens_venda').insert({
        empresa_representada_id: empresa.id,
        venda_id: venda.id,
        descricao: 'Produto smoke fiscal mock',
        quantidade: 1,
        unidade: 'UN',
        preco_unitario: 1117.9,
        valor_total_item: 1117.9,
        ordem: 1,
        tipo_item: 'P',
        produto_id: produtoId,
      });
      if (itemInsertErr) return { error: itemInsertErr.message };
    } else {
      await client.from('itens_venda').update({ produto_id: produtoId, tipo_item: 'P' }).eq('venda_id', venda.id);
    }

    return { venda };
  };

  const isVendaEmitivel = async (id: string): Promise<{ ok: boolean; reason?: string }> => {
    const { data: venda, error: vendaErr } = await client
      .from('vendas')
      .select('id, cliente_id, empresa_representada_id')
      .eq('id', id)
      .maybeSingle();
    if (vendaErr) return { ok: false, reason: vendaErr.message };
    if (!venda?.cliente_id) return { ok: false, reason: 'venda sem cliente vinculado' };
    if (!venda?.empresa_representada_id) return { ok: false, reason: 'venda sem empresa vinculada' };

    const { count, error: itensErr } = await client
      .from('itens_venda')
      .select('id', { count: 'exact', head: true })
      .eq('venda_id', id);
    if (itensErr) return { ok: false, reason: itensErr.message };
    if ((count ?? 0) === 0) return { ok: false, reason: 'venda sem itens' };
    return { ok: true };
  };

  const pickElegivel = async (): Promise<{ venda?: VendaSmokeCandidate; error?: string }> => {
    const { data, error } = await client
      .from('vendas')
      .select('id, numero_venda, status, cliente_id, empresa_representada_id')
      .is('deleted_at', null)
      .in('status', eligibleStatusValues)
      .not('cliente_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data?.id) return ensureSmokeFixture();

    const ready = await isVendaEmitivel(data.id);
    if (!ready.ok) return ensureSmokeFixture();
    return { venda: data as VendaSmokeCandidate };
  };

  const findVenda = async (ref: string): Promise<{ venda?: VendaSmokeCandidate; error?: string }> => {
    const query = client
      .from('vendas')
      .select('id, numero_venda, status, cliente_id, empresa_representada_id')
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();

    const { data, error } = isUuid(ref)
      ? await query.eq('id', ref)
      : await query.eq('numero_venda', ref);

    if (error) return { error: error.message };
    if (!data?.id) return {};
    return { venda: data as VendaSmokeCandidate };
  };

  if (!vendaId) {
    const pick = await pickElegivel();
    if (pick.error) return json({ error: 'no_venda_available', message: pick.error }, 404);
    vendaId = pick.venda!.id;
  } else {
    const found = await findVenda(vendaId);
    if (found.error) return json({ error: 'venda_lookup_failed', message: found.error }, 500);
    if (!found.venda) {
      const pick = await pickElegivel();
      if (pick.error) {
        return json({ error: 'venda_not_found', message: `venda ${vendaId} não encontrada por UUID/número e não há venda elegível para fallback` }, 404);
      }
      console.log(`[fiscal-smoke-run] venda ${vendaId} não encontrada — usando fallback ${pick.venda!.id}`);
      vendaId = pick.venda!.id;
    } else if (!isEligible(found.venda.status)) {
      return json({
        error: 'venda_status_not_eligible',
        message: `venda ${found.venda.numero_venda ?? found.venda.id} está com status=${found.venda.status}; status aceitos: ${eligibleStatuses.join(', ')}`,
      }, 409);
    } else {
      const ready = await isVendaEmitivel(found.venda.id);
      if (!ready.ok) {
        const fixture = await ensureSmokeFixture();
        if (fixture.error) return json({ error: 'venda_not_emitible', message: `${ready.reason}; fallback mock falhou: ${fixture.error}` }, 422);
        console.log(`[fiscal-smoke-run] venda ${found.venda.numero_venda ?? found.venda.id} não emitível (${ready.reason}) — usando fixture ${fixture.venda!.id}`);
        vendaId = fixture.venda!.id;
      } else {
        vendaId = found.venda.id;
      }
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
