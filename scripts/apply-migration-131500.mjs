// node scripts/apply-migration-131500.mjs
// Aplica de vez (COMMIT real) a migration 20260914131500 e registra no
// historico de schema_migrations.
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

const historySql = `
INSERT INTO supabase_migrations.schema_migrations(version,name)
VALUES ('20260914131500','fix_webhook_titulo_liquidado_valor_acumulado')
ON CONFLICT (version) DO NOTHING;
`;

const folder = await mkdtemp(join(tmpdir(), 'erp-migration-131500-'));
try {
  const file = join(folder, 'apply.sql');
  await writeFile(
    file,
    `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n${migrationSql}\n${historySql}\nCOMMIT; SELECT 'applied' AS resultado;`,
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
  await rm(join(folder, 'apply.sql'), { force: true });
  await rmdir(folder);
}
