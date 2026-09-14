// node scripts/check-webhook-envelope-fix.mjs [--apply]
// Default: aplica a migration + insere um titulo/liquidacao sintetico pra
// verificar o payload gerado, tudo revertido por ROLLBACK.
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const apply = process.argv.includes('--apply');
const ref = (await readFile('supabase/.temp/project-ref', 'utf8')).trim();
if (ref !== 'reksodqzemboaeqxnxyy') throw new Error('Projeto vinculado não é o ERP');

const migrationSql = await readFile(
  'supabase/migrations/20260914130000_fix_webhook_titulo_liquidado_envelope.sql',
  'utf8',
);

const checkSql = `
DO $$
DECLARE
  v_empresa_id uuid := '47bc75bc-0fba-4328-ab76-d5e880546e23';
  v_titulo_id uuid;
  v_liquidacao_id uuid;
  v_payload jsonb;
BEGIN
  INSERT INTO public.contas_receber (
    empresa_representada_id, numero_documento, descricao, valor_original,
    data_vencimento, status
  ) VALUES (
    v_empresa_id, 'TESTE-ENVELOPE-A09', 'Teste envelope webhook (revertido)', 100,
    current_date, 'PENDENTE'
  ) RETURNING id INTO v_titulo_id;

  INSERT INTO public.liquidacoes_titulos (
    empresa_representada_id, titulo_id, tipo_titulo, valor_pago,
    valor_original_titulo, data_pagamento, data_liquidacao, forma_pagamento,
    idempotency_key
  ) VALUES (
    v_empresa_id, v_titulo_id, 'CONTAS_RECEBER', 100, 100, current_date, current_date, 'PIX',
    gen_random_uuid()
  ) RETURNING id INTO v_liquidacao_id;

  SELECT payload INTO v_payload
  FROM public.webhook_outbox
  WHERE empresa_representada_id = v_empresa_id
    AND evento = 'titulo.liquidado'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'ENSAIO_FALHOU: nenhum webhook_outbox foi enfileirado';
  END IF;

  IF v_payload->>'type' IS DISTINCT FROM 'receivable.paid' THEN
    RAISE EXCEPTION 'ENSAIO_FALHOU: type esperado receivable.paid, veio %', v_payload->>'type';
  END IF;

  IF v_payload->>'idempotency_key' IS DISTINCT FROM 'novus-educacional:0f07e009-bc32-427a-9644-ad43e3cf5f99:TESTE-ENVELOPE-A09' THEN
    RAISE EXCEPTION 'ENSAIO_FALHOU: idempotency_key errada: %', v_payload->>'idempotency_key';
  END IF;

  IF (v_payload->'data'->>'valor_pago')::numeric IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'ENSAIO_FALHOU: data.valor_pago errado: %', v_payload->'data'->>'valor_pago';
  END IF;

  RAISE NOTICE 'ENSAIO_OK: payload = %', v_payload;
END $$;
`;

const folder = await mkdtemp(join(tmpdir(), 'erp-webhook-fix-'));
try {
  const file = join(folder, 'check.sql');
  await writeFile(
    file,
    `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n${migrationSql}\n${checkSql}\n${apply ? 'COMMIT' : 'ROLLBACK'}; SELECT '${apply ? 'applied' : 'checks_passed_rollback'}' AS resultado;`,
    'utf8',
  );
  const result = spawnSync(
    'supabase',
    ['db', 'query', '--linked', '--file', file, '--output-format', 'json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(join(folder, 'check.sql'), { force: true });
  await rmdir(folder);
}
