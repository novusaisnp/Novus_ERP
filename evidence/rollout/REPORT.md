# RELATÓRIO EXECUTIVO — Operacionalização do Cutover V2 por Lotes

Data: 2026-07-12
Ambiente: produção (funções SQL + script operacional)

## 1) Arquivos criados/alterados

- **Migration (aplicada):** `20260712_rollout_v2_tenant_ops` + `20260712_rollout_v2_revoke_public`
  - Cria 5 funções operacionais + 1 precheck. Revoga EXECUTE de `PUBLIC`/`anon`.
- **Docs de referência:** `supabase/sql/rollout_v2_tenant_ops.sql`, `supabase/sql/rollout_v2_dashboards.sql`
- **Script operacional:** `scripts/rollout/v2-cutover.mjs`
- **Evidências:** `evidence/rollout/2026-07-12/*.json`, `evidence/rollout/REPORT.md`

## 2) Funções SQL implementadas

| Função | Assinatura | Comportamento |
|---|---|---|
| `check_v2_readiness` | `(tenant uuid, nome text, min_events int=20)` | Retorna JSONB com métricas 7d e `ready` boolean |
| `promote_to_dual` | `(tenant uuid, nome text)` | Idempotente; `v1→dual` (bloqueia demais estados) |
| `promote_to_v2_only` | `(tenant uuid, nome text, min_events int=20)` | Gate via `check_v2_readiness`; grava `v2_enforced_at` |
| `rollback_to_dual` | `(tenant uuid, nome text)` | Retorna a aceitar V1 |
| `rollback_to_v1` | `(tenant uuid, nome text)` | Rollback profundo — remove V2 |
| `precheck_source_system_nome_consistency` | `()` | Aponta divergências `source_system` vs `nome` |

Todas com `SECURITY DEFINER` + guard `has_role(auth.uid(),'admin')` + `EXECUTE` revogado de PUBLIC/anon. Retorno estruturado: `{ status, current_state, ready?, reason, changed_rows, executed_at }`.

## 3) Evidência dos 6 testes

Setup: tenant fixo `44444444-...`, config `ROLLOUT_TEST` iniciada em `v1`. Contexto de admin injetado via `request.jwt.claim.sub` do usuário admin real.

| # | Teste | Resultado obtido | Status |
|---|---|---|---|
| 1 | `v1 → promote_to_dual` | `status=ok`, `current_state=dual`, `changed_rows=1` | ✅ PASS |
| 2 | Sem prontidão → `promote_to_v2_only` | `status=blocked`, `reason=v2_ok_below_min_events (0<20)` | ✅ PASS |
| 3 | Com 25 deliveries V2 verdes → `promote_to_v2_only` | `status=ok`, `reason=enforced`, `v2_only=true`, `v2_enforced_at IS NOT NULL` | ✅ PASS |
| 4 | `rollback_to_dual` após v2_only | `status=ok`, `current_state=dual`, `v2_only=false` | ✅ PASS |
| 5 | `rollback_to_v1` | `status=ok`, `current_state=v1` | ✅ PASS |
| 6 | Dry-run matrix (SELECT em todos tenants ROLLOUT_%) | Retorna `nome/state/ready/reason` — matriz executiva | ✅ PASS |

## 4) Exemplo real de relatório dry-run por lote

```
     nome     | state | ready | reason
--------------+-------+-------+--------
 ROLLOUT_TEST | v1    | true  | ok
```

O script `v2-cutover.mjs --mode dry-run` gera, por tenant, artefato JSON + Markdown em `evidence/rollout/<data>/<mode>-<tenant>-<nome>.json/.md` contendo `before/readiness/action/after` e `elapsed_ms`.

## 5) Prova de SLO de rollback ≤5min

Medição direta via `\timing` em psql executando a RPC `rollback_to_dual` sobre config em `v2_only`:

```
SELECT public.rollback_to_dual(...);
Time: 82.779 ms
```

**82,8 ms** contra teto de **300.000 ms (5 min)** → margem ~3.600×. O script `v2-cutover.mjs` também instrumenta `started_at`/`finished_at`/`elapsed_ms` e marca `slo_rollback_ok=true` no relatório JSON quando `mode` inicia com `rollback-` e `elapsed_ms ≤ 300000`.

## 6) Riscos remanescentes

- **JWT admin em automação:** o script requer `ROLLOUT_ADMIN_JWT` (ou o fluxo interativo do painel). Documentar processo de emissão temporária.
- **Reasons detalhadas de erro** (`invalid_v1|invalid_v2|missing_v2|v2_required|timestamp_out_of_window|missing_delivery_id`) permanecem apenas nos Function Logs; `webhook_deliveries.outcome` só granula em `accepted|processed|error|duplicate`. Aceitável para operação; próxima iteração pode persistir `reason` na tabela.
- **`precheck_source_system_nome_consistency`** é consultivo; não bloqueia promoção. Divergências devem ser tratadas manualmente antes do cutover.
- Warnings do linter (SECURITY DEFINER visível a `authenticated`) permanecem — mitigados por `has_role(admin)` interno.

## 7) Próximo passo único priorizado

**Iniciar Pilot Lote 1**: selecionar 1 tenant real de baixo volume (<100 req/dia), executar `v2-cutover.mjs --mode dry-run --wave pilot-1` para produzir baseline arquivado, comunicar cliente, e executar `--mode promote-dual` no D0 da janela definida. Nenhum outro tenant migra até 7 dias verdes em `dual` + `check_v2_readiness.ready=true`.
