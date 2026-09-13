// Executar com: `deno test supabase/functions/evaluate-ops-alerts/thresholds.test.ts`

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { evalCronJobsStalled, evalWebhookOutboxBacklog } from './thresholds.ts';

Deno.test('evalCronJobsStalled: nao alerta dentro do intervalo esperado', () => {
  const out = evalCronJobsStalled([{ jobname: 'process-webhook-outbox', ageSeconds: 30, lastStatus: 'succeeded' }]);
  assertEquals(out.length, 0);
});

Deno.test('evalCronJobsStalled: warning quando passa de 3x o intervalo', () => {
  const out = evalCronJobsStalled([{ jobname: 'process-webhook-outbox', ageSeconds: 200, lastStatus: 'succeeded' }]);
  assertEquals(out.length, 1);
  assertEquals(out[0].severity, 'warning');
});

Deno.test('evalCronJobsStalled: page quando passa de 5x o intervalo ou nunca rodou', () => {
  const nuncaRodou = evalCronJobsStalled([{ jobname: 'process-webhook-outbox', ageSeconds: null, lastStatus: null }]);
  assertEquals(nuncaRodou[0].severity, 'page');

  const muitoAtrasado = evalCronJobsStalled([{ jobname: 'process-webhook-outbox', ageSeconds: 400, lastStatus: 'succeeded' }]);
  assertEquals(muitoAtrasado[0].severity, 'page');
});

Deno.test('evalCronJobsStalled: warning quando ultima execucao falhou mesmo dentro do intervalo', () => {
  const out = evalCronJobsStalled([{ jobname: 'process-webhook-outbox', ageSeconds: 30, lastStatus: 'failed' }]);
  assertEquals(out.length, 1);
  assertEquals(out[0].reason, 'last_run_failed:process-webhook-outbox');
});

Deno.test('evalCronJobsStalled: job desconhecido nao e avaliado', () => {
  const out = evalCronJobsStalled([{ jobname: 'job-novo-sem-intervalo-cadastrado', ageSeconds: 999999, lastStatus: 'failed' }]);
  assertEquals(out.length, 0);
});

Deno.test('evalWebhookOutboxBacklog: sem pendentes nao alerta', () => {
  assertEquals(evalWebhookOutboxBacklog({ pendentes: 0, oldestPendingAgeSeconds: null, falhasRepetidas: 0 }), null);
});

Deno.test('evalWebhookOutboxBacklog: warning com poucos pendentes ou 1 falha repetida', () => {
  const out = evalWebhookOutboxBacklog({ pendentes: 1, oldestPendingAgeSeconds: 60, falhasRepetidas: 1 });
  assertEquals(out?.severity, 'warning');
});

Deno.test('evalWebhookOutboxBacklog: page com backlog grande ou muitas falhas repetidas', () => {
  const out = evalWebhookOutboxBacklog({ pendentes: 150, oldestPendingAgeSeconds: 4000, falhasRepetidas: 20 });
  assertEquals(out?.severity, 'page');
});
