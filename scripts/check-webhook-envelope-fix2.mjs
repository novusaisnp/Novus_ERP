// node scripts/check-webhook-envelope-fix2.mjs
// Testa a correcao 20260914131500 (restaura valor acumulado) com um cenario
// de pagamento parcial seguido de quitacao. Sempre ROLLBACK (so diagnostico).
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ref = (await readFile('supabase/.temp/project-ref', 'utf8')).trim();
if (ref !== 'reksodqzemboaeqxnxyy') throw new Error('Projeto vinculado não é o ERP');

const migrationSql = await readFile(
  'supabase/migrations/20260914131500_fix_webhook_titulo_liquidado_valor_acumulado.sql',
  'utf8',
);

const checkSql = `
INSERT INTO public.contas_receber (
  empresa_representada_id, numero_documento, descricao, valor_original,
  valor_recebido, data_vencimento, status
) VALUES (
  '47bc75bc-0fba-4328-ab76-d5e880546e23', 'TESTE-ACUMULADO-A09', 'Teste (revertido)', 100,
  0, current_date, 'PENDENTE'
);

INSERT INTO public.liquidacoes_titulos (
  empresa_representada_id, titulo_id, tipo_titulo, valor_pago,
  valor_original_titulo, data_pagamento, data_liquidacao, forma_pagamento, idempotency_key
)
SELECT '47bc75bc-0fba-4328-ab76-d5e880546e23', id, 'CONTAS_RECEBER', 40, 100, current_date, current_date, 'PIX', gen_random_uuid()
FROM public.contas_receber WHERE numero_documento = 'TESTE-ACUMULADO-A09';

UPDATE public.contas_receber SET valor_recebido = 40 WHERE numero_documento = 'TESTE-ACUMULADO-A09';

INSERT INTO public.liquidacoes_titulos (
  empresa_representada_id, titulo_id, tipo_titulo, valor_pago,
  valor_original_titulo, data_pagamento, data_liquidacao, forma_pagamento, idempotency_key
)
SELECT '47bc75bc-0fba-4328-ab76-d5e880546e23', id, 'CONTAS_RECEBER', 60, 100, current_date, current_date, 'PIX', gen_random_uuid()
FROM public.contas_receber WHERE numero_documento = 'TESTE-ACUMULADO-A09';

SELECT o.payload->>'type' AS type, o.payload->'data'->>'valor_pago' AS valor_pago, o.payload->>'idempotency_key' AS idempotency_key
FROM public.webhook_outbox o
JOIN public.contas_receber cr ON cr.id = (o.payload->'data'->>'titulo_id')::uuid
WHERE cr.numero_documento = 'TESTE-ACUMULADO-A09'
ORDER BY (o.payload->'data'->>'valor_pago')::numeric;
`;

const folder = await mkdtemp(join(tmpdir(), 'erp-webhook-fix2-'));
try {
  const file = join(folder, 'check.sql');
  await writeFile(
    file,
    `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n${migrationSql}\n${checkSql}\nROLLBACK;`,
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
