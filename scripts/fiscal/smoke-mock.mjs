#!/usr/bin/env node
/**
 * Smoke test interno do módulo fiscal em modo mockado.
 *
 * Requer:
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 *   SMOKE_JWT  (JWT de um usuário admin autenticado)
 *   SMOKE_VENDA_ID  (opcional — venda faturada de teste)
 *
 * Uso:
 *   node scripts/fiscal/smoke-mock.mjs
 */
const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const jwt = process.env.SMOKE_JWT;
const vendaId = process.env.SMOKE_VENDA_ID;

if (!url || !anon || !jwt) {
  console.error(JSON.stringify({ level: 'error', msg: 'faltando VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY/SMOKE_JWT' }));
  process.exit(2);
}
if (!vendaId) {
  console.error(JSON.stringify({ level: 'error', msg: 'defina SMOKE_VENDA_ID com uma venda faturada' }));
  process.exit(2);
}

const call = async (fn, body) => {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const log = (o) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...o }));

const main = async () => {
  log({ step: 'emitir', vendaId });
  const emit = await call('fiscal-emitir-nfe', { vendaId });
  if (!emit.data?.documento_id) {
    log({ step: 'emitir', ok: false, ...emit });
    process.exit(1);
  }
  const documentoId = emit.data.documento_id;
  log({ step: 'emitir', ok: true, documentoId, mock: emit.data.mock });

  log({ step: 'cce' });
  const cce = await call('fiscal-cce-nfe', {
    documentoId,
    correcao: 'Correção de texto de smoke test (mockada)',
  });
  log({ step: 'cce', ok: cce.status === 200, ...cce.data });

  log({ step: 'cancelar' });
  const canc = await call('fiscal-cancelar-nfe', {
    documentoId,
    justificativa: 'Cancelamento de smoke test em modo mock',
  });
  log({ step: 'cancelar', ok: canc.status === 200, ...canc.data });

  const allOk = emit.status === 200 && cce.status === 200 && canc.status === 200;
  log({ step: 'done', ok: allOk });
  process.exit(allOk ? 0 : 1);
};

main().catch((err) => {
  console.error(JSON.stringify({ level: 'error', err: err.message }));
  process.exit(1);
});
