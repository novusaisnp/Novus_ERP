// node scripts/check-etapa1-concorrencia.mjs
//
// Homologação de concorrência real (2 conexões simultâneas) dos achados A02/A04 da
// AUDITORIA_PRONTIDAO_MERCADO_2026-09-13.md, complementando o ensaio sequencial de
// supabase/tests/etapa1_integridade.sql (que roda tudo numa única transação com
// ROLLBACK e por isso não pode provar bloqueio entre sessões diferentes).
//
// Cria uma fixture mínima e COMMITADA (necessário: duas conexões só enxergam dado já
// commitado uma da outra), dispara duas inserções verdadeiramente concorrentes contra a
// MESMA conta bancária e o MESMO produto, confere que o resultado final soma as duas
// operações sem perda (prova definitiva contra lost-update, robusta mesmo se o overlap
// de timing não for perfeito), e remove a fixture inteira ao final — com verificação de
// zero linhas remanescentes.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';

const ref = (await readFile('supabase/.temp/project-ref', 'utf8')).trim();
if (ref !== 'reksodqzemboaeqxnxyy') throw new Error('Projeto vinculado não é o ERP');

const empresa = randomUUID();
const conta = randomUUID();
const produto = randomUUID();
const local = randomUUID();

function runFile(sql, label) {
  return new Promise(async (resolve, reject) => {
    const file = join(tmpdir(), `erp-etapa1-conc-${label}-${randomUUID()}.sql`);
    await writeFile(file, sql, 'utf8');
    const startedAt = Date.now();
    const child = spawn('supabase', ['db', 'query', '--linked', '--file', file, '--output-format', 'json'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', async code => {
      await rm(file, { force: true });
      resolve({ label, code, stdout, stderr, ms: Date.now() - startedAt });
    });
    child.on('error', reject);
  });
}

function runFileSync(sql, label) {
  const file = join(tmpdir(), `erp-etapa1-conc-${label}.sql`);
  return writeFile(file, sql, 'utf8').then(() => {
    const result = spawnSync('supabase', ['db', 'query', '--linked', '--file', file, '--output-format', 'json'], { encoding: 'utf8' });
    return rm(file, { force: true }).then(() => result);
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALHOU: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

console.log('== Etapa 1 — homologação de concorrência real (2 conexões) ==\n');
console.log(`Fixture: empresa=${empresa} conta=${conta} produto=${produto} local=${local}\n`);

try {
  // 1) Setup — fixture mínima, COMMITADA de propósito (precisa ser visível às duas
  // conexões concorrentes das etapas seguintes).
  console.log('[1/5] Criando fixture (commit real, nome bem marcado p/ auditoria)...');
  const setup = await runFileSync(`
BEGIN;
INSERT INTO public.empresas_representadas(id,nome) VALUES ('${empresa}','HOMOLOGACAO ETAPA1 CONCORRENCIA (temporario)');
INSERT INTO public.contas_bancarias(id,empresa_representada_id,numero_conta,conta_cofre,saldo_inicial) VALUES ('${conta}','${empresa}','HOMOLOG-CONC',true,0);
INSERT INTO public.localizacoes_estoque(id,empresa_representada_id,nome) VALUES ('${local}','${empresa}','Local Homologacao Concorrencia');
INSERT INTO public.produtos(id,empresa_representada_id,nome,controla_estoque) VALUES ('${produto}','${empresa}','Produto Homologacao Concorrencia',true);
INSERT INTO public.estoque_movimentacoes(empresa_representada_id,produto_id,tipo,quantidade,localizacao_destino_id,documento_ref) VALUES ('${empresa}','${produto}','ENTRADA',100,'${local}','SEED-HOMOLOG');
COMMIT;
SELECT 'fixture_criada' AS etapa;
`, 'setup');
  if (setup.status !== 0) throw new Error(`Setup falhou: ${setup.stderr || setup.stdout}`);
  console.log('  ✓ fixture commitada\n');

  // 2) Concorrência real — saldo bancário (A04): duas inserções simultâneas na MESMA
  // conta, cada uma em sua própria conexão/transação.
  console.log('[2/5] Disparando 2 depósitos concorrentes na MESMA conta bancária...');
  const bancoSql = (label, valor) => `
BEGIN;
SELECT clock_timestamp() AS inicio_${label};
INSERT INTO public.movimentacoes_bancarias(empresa_representada_id,conta_bancaria_id,tipo,valor,data_lancamento,status,descricao)
  VALUES ('${empresa}','${conta}','DEPOSITO',${valor},CURRENT_DATE,'EFETIVADO','Homologação concorrência ${label}');
SELECT clock_timestamp() AS fim_${label};
COMMIT;
`;
  const [bancoA, bancoB] = await Promise.all([
    runFile(bancoSql('A', 10), 'banco-a'),
    runFile(bancoSql('B', 10), 'banco-b'),
  ]);
  for (const r of [bancoA, bancoB]) {
    if (r.code !== 0) throw new Error(`Depósito ${r.label} falhou: ${r.stderr || r.stdout}`);
    console.log(`  conexão ${r.label}: ${r.ms}ms (roundtrip total do processo)`);
  }

  // 3) Concorrência real — estoque (A02): duas saídas simultâneas do MESMO produto.
  console.log('\n[3/5] Disparando 2 saídas de estoque concorrentes do MESMO produto...');
  const estoqueSql = (label, qtd) => `
BEGIN;
SELECT clock_timestamp() AS inicio_${label};
INSERT INTO public.estoque_movimentacoes(empresa_representada_id,produto_id,tipo,quantidade,localizacao_origem_id,documento_ref)
  VALUES ('${empresa}','${produto}','SAIDA',${qtd},'${local}','CONC-${label}');
SELECT clock_timestamp() AS fim_${label};
COMMIT;
`;
  const [estA, estB] = await Promise.all([
    runFile(estoqueSql('A', 30), 'estoque-a'),
    runFile(estoqueSql('B', 30), 'estoque-b'),
  ]);
  for (const r of [estA, estB]) {
    if (r.code !== 0) throw new Error(`Saída ${r.label} falhou: ${r.stderr || r.stdout}`);
    console.log(`  conexão ${r.label}: ${r.ms}ms (roundtrip total do processo)`);
  }

  // 4) Verificação — se houvesse lost update (bug que a Etapa 1 corrigiu), o saldo
  // ficaria 10 (não 20) e o estoque ficaria 70 (não 40): uma das duas escritas
  // concorrentes teria sobrescrito a outra em vez de somar.
  console.log('\n[4/5] Verificando resultado final (prova contra lost-update)...');
  const verify = await runFileSync(`
SELECT
  (SELECT saldo_atual FROM public.contas_bancarias WHERE id='${conta}') AS saldo,
  (SELECT estoque_atual FROM public.produtos WHERE id='${produto}') AS estoque;
`, 'verify');
  if (verify.status !== 0) throw new Error(`Verificação falhou: ${verify.stderr || verify.stdout}`);
  const row = JSON.parse(verify.stdout).rows[0];
  console.log(`  saldo_atual=${row.saldo}  estoque_atual=${row.estoque}`);
  assert(Number(row.saldo) === 20, 'saldo bancário soma as 2 movimentações concorrentes (10+10=20), sem perder nenhuma');
  assert(Number(row.estoque) === 40, 'estoque desconta as 2 saídas concorrentes (100-30-30=40), sem perder nenhuma');

  console.log('\n✅ Concorrência real provada: nenhuma escrita concorrente foi perdida.');
} finally {
  // 5) Limpeza — remove a fixture inteira. Ordem e passos abaixo não são arbitrários;
  // cada um existe por um bug real de FK/trigger achado ao homologar isto pela primeira
  // vez (2026-09-13), contra o banco vinculado real:
  //   a) `trigger_registrar_historico` (AFTER _DELETE_ em movimentacoes_bancarias) tenta
  //      inserir em historico_movimentacoes_bancarias uma FK para a própria linha que
  //      acabou de ser apagada — sempre falha (23503) num hard delete. Desabilitado só
  //      durante esta transação de limpeza (nunca em código de produto).
  //   b) `empresas_representadas` tem 11 colunas `plano_conta_*_default_id` apontando
  //      para `plano_contas`, que por sua vez aponta de volta pra `empresas_representadas`
  //      — ciclo de FK. Tem que anular as 11 antes de apagar `plano_contas`.
  //   c) A trigger de histórico de estoque também dispara em DELETE de
  //      `estoque_movimentacoes`, recriando linhas em `historico_estoque_movimentacoes`
  //      depois que ela já foi limpa — por isso essa tabela é limpa de novo, por último.
  console.log('\n[5/5] Limpando fixture...');
  const cleanup = await runFileSync(`
BEGIN;
ALTER TABLE public.movimentacoes_bancarias DISABLE TRIGGER trigger_registrar_historico;
UPDATE public.empresas_representadas SET
  plano_conta_receita_default_id=NULL, plano_conta_despesa_default_id=NULL,
  plano_conta_caixa_bancos_default_id=NULL, plano_conta_contas_receber_default_id=NULL,
  plano_conta_contas_pagar_default_id=NULL, plano_conta_imobilizado_default_id=NULL,
  plano_conta_depreciacao_acumulada_default_id=NULL, plano_conta_despesa_depreciacao_default_id=NULL,
  plano_conta_resultado_baixa_ativo_default_id=NULL, plano_conta_estoque_materia_prima_default_id=NULL,
  plano_conta_estoque_produtos_acabados_default_id=NULL
  WHERE id='${empresa}';
DELETE FROM public.historico_movimentacoes_bancarias WHERE empresa_representada_id='${empresa}';
DELETE FROM public.historico_contas_bancarias WHERE empresa_representada_id='${empresa}';
DELETE FROM public.historico_estoque_movimentacoes WHERE empresa_representada_id='${empresa}';
DELETE FROM public.movimentacoes_bancarias WHERE empresa_representada_id='${empresa}';
DELETE FROM public.estoque_movimentacoes WHERE empresa_representada_id='${empresa}';
DELETE FROM public.historico_estoque_movimentacoes WHERE empresa_representada_id='${empresa}';
DELETE FROM public.contas_bancarias WHERE empresa_representada_id='${empresa}';
DELETE FROM public.produtos WHERE empresa_representada_id='${empresa}';
DELETE FROM public.localizacoes_estoque WHERE empresa_representada_id='${empresa}';
DELETE FROM public.plano_contas WHERE empresa_representada_id='${empresa}';
DELETE FROM public.empresas_representadas WHERE id='${empresa}';
ALTER TABLE public.movimentacoes_bancarias ENABLE TRIGGER trigger_registrar_historico;
COMMIT;
SELECT
  (SELECT count(*) FROM public.empresas_representadas WHERE id='${empresa}') +
  (SELECT count(*) FROM public.contas_bancarias WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.produtos WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.localizacoes_estoque WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.movimentacoes_bancarias WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.estoque_movimentacoes WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.historico_contas_bancarias WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.historico_estoque_movimentacoes WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.historico_movimentacoes_bancarias WHERE empresa_representada_id='${empresa}') +
  (SELECT count(*) FROM public.plano_contas WHERE empresa_representada_id='${empresa}')
  AS residuo;
`, 'cleanup');
  if (cleanup.status !== 0) {
    console.error(`  ⚠ LIMPEZA FALHOU — fixture ${empresa} pode ter ficado no banco. Verificar manualmente.`);
    console.error(cleanup.stderr || cleanup.stdout);
    process.exitCode = 1;
  } else {
    const residuo = Number(JSON.parse(cleanup.stdout).rows[0].residuo);
    if (residuo === 0) {
      console.log('  ✓ fixture removida por completo (0 linhas residuais confirmado)');
    } else {
      console.error(`  ⚠ ${residuo} linha(s) residual(is) da fixture ${empresa} — verificar manualmente.`);
      process.exitCode = 1;
    }
  }
}
