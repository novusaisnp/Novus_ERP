-- SEED CLEANUP — Reversão total do dataset [SEED-P8] populado em 13/07/2026.
-- Deve ser executado via migration (tooling requer aprovação para DELETE).
-- Idempotente: rodar múltiplas vezes é seguro (0 linhas se já limpo).
--
-- Ordem respeita FKs (folhas → raízes). Todos os filtros usam o marcador do batch.

BEGIN;

-- 1) Ops (não dependem de nada)
DELETE FROM public.report_ops_audit  WHERE metadata->>'seed' = 'P8';
DELETE FROM public.report_ops_alerts WHERE reason LIKE '[SEED-P8]%';

-- 2) Runs → schedules
DELETE FROM public.report_schedule_runs WHERE idempotency_key LIKE 'SEED-P8-%';
DELETE FROM public.report_schedules     WHERE '[SEED-P8]' = ANY(recipients);

-- 3) Financeiro (folhas antes de cadastros)
DELETE FROM public.contas_receber WHERE observacoes = '[SEED-P8]';
DELETE FROM public.contas_pagar   WHERE observacoes = '[SEED-P8]';

-- 4) Cadastros
DELETE FROM public.fornecedores WHERE observacoes = '[SEED-P8]';
DELETE FROM public.clientes     WHERE observacoes = '[SEED-P8]';

COMMIT;

-- Validação pós-cleanup (deve retornar 0 em todas as colunas)
SELECT
  (SELECT count(*) FROM public.clientes             WHERE observacoes='[SEED-P8]')          AS clientes,
  (SELECT count(*) FROM public.fornecedores         WHERE observacoes='[SEED-P8]')          AS fornecedores,
  (SELECT count(*) FROM public.contas_pagar         WHERE observacoes='[SEED-P8]')          AS contas_pagar,
  (SELECT count(*) FROM public.contas_receber       WHERE observacoes='[SEED-P8]')          AS contas_receber,
  (SELECT count(*) FROM public.report_schedules     WHERE '[SEED-P8]' = ANY(recipients))    AS schedules,
  (SELECT count(*) FROM public.report_schedule_runs WHERE idempotency_key LIKE 'SEED-P8-%') AS runs,
  (SELECT count(*) FROM public.report_ops_alerts    WHERE reason LIKE '[SEED-P8]%')         AS alerts,
  (SELECT count(*) FROM public.report_ops_audit     WHERE metadata->>'seed' = 'P8')         AS audit;
