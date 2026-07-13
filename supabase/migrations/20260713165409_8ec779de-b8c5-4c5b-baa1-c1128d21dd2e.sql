-- P11 CLEANUP (revisado) — Remove [SEED-P8] cobrindo vendas/itens
SET LOCAL statement_timeout = '5min';
SET LOCAL lock_timeout = '10s';

-- 1) Ops
DELETE FROM public.report_ops_audit  WHERE metadata->>'seed' = 'P8';
DELETE FROM public.report_ops_alerts WHERE reason LIKE '[SEED-P8]%';

-- 2) Runs → schedules
DELETE FROM public.report_schedule_runs WHERE idempotency_key LIKE 'SEED-P8-%';
DELETE FROM public.report_schedules     WHERE '[SEED-P8]' = ANY(recipients);

-- 3) Vendas: filhos primeiro
DELETE FROM public.itens_venda
 WHERE venda_id IN (SELECT id FROM public.vendas WHERE numero_venda LIKE 'V-SEED-%');
DELETE FROM public.vendas WHERE numero_venda LIKE 'V-SEED-%';

-- 4) Financeiro
DELETE FROM public.contas_receber WHERE observacoes = '[SEED-P8]';
DELETE FROM public.contas_pagar   WHERE observacoes = '[SEED-P8]';

-- 5) Cadastros
DELETE FROM public.fornecedores WHERE observacoes = '[SEED-P8]';
DELETE FROM public.clientes     WHERE observacoes = '[SEED-P8]';

-- 6) Registry
DROP TABLE IF EXISTS public._seed_registry;