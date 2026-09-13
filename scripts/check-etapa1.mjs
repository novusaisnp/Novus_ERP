// node scripts/check-etapa1.mjs [--apply]
// Default: migrations + regressões no banco vinculado, tudo revertido por ROLLBACK.
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');
if (apply && verify) throw new Error('Escolha --apply ou --verify');
const ref = (await readFile('supabase/.temp/project-ref', 'utf8')).trim();
if (ref !== 'reksodqzemboaeqxnxyy') throw new Error('Projeto vinculado não é o ERP');
const migrations = [
  '20260913170000_etapa1_permissoes_operacionais',
  '20260913171000_etapa1_saldo_bancario',
  '20260913172000_etapa1_vendas_atomicas',
];
const sql = await Promise.all(migrations.map(name => readFile(`supabase/migrations/${name}.sql`, 'utf8')));
const checks = await readFile('supabase/tests/etapa1_integridade.sql', 'utf8');
const history = migrations.map(name => {
  const [version, ...parts] = name.split('_');
  return `INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES('${version}','${parts.join('_')}');`;
}).join('\n');
const folder = await mkdtemp(join(tmpdir(), 'erp-etapa1-'));
try {
  const file = join(folder, 'check.sql');
  await writeFile(file, `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n${verify ? '' : sql.join('\n')}\n${apply ? history : checks}\n${apply ? 'COMMIT' : 'ROLLBACK'}; SELECT '${apply ? 'applied' : 'checks_passed_rollback'}' AS etapa1;`, 'utf8');
  const result = spawnSync('supabase', ['db', 'query', '--linked', '--file', file, '--output-format', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  // Remove somente o arquivo temporário gerado acima, sem operação recursiva.
  await rm(join(folder, 'check.sql'), { force: true });
  await rmdir(folder);
}
