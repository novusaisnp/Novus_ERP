# RUNBOOK P5 — Report Schedules Pipeline (NOVUS ERP)

> Runbook operacional consolidando P4.2A + P5.1..P5.4.
> Estado atual: **DELIVERY_PROVIDER = noop** (sem envio de e-mail).
> Owner: Backend / SRE.

---

## 1. Arquitetura resumida

```
cron (pg_cron / scheduler)
      │
      ▼
supabase/functions/run-report-schedules
      │  1. lê schedules due (enabled + next_run_at <= now)
      │  2. cria run idempotente (report_schedule_runs)
      │  3. valida view_state
      │  4. loadScopeData (paginado 5k, cap por formato)   ← P5.3
      │  5. gera artefato (csv/xlsx/pdf)
      │  6. upload storage + createSignedUrl (TTL 7d)
      │  7. DeliveryProvider.send  → NoopProvider ("skipped")
      │  8. atualiza run + next_run_at
      │
      ├── retry: backoff 5m / 15m / 60m, MAX_ATTEMPTS = 3
      └── failure: reason canônico (errorCodes.ts)          ← P5.1/P5.3

supabase/functions/resign-report-run    ← P5.2
      │  regenera signed URL sem reexecutar export
      │  rate limit: 10 resigns/dia por run
```

**Tabelas críticas:** `report_schedules`, `report_schedule_runs`
**Storage bucket:** `report-exports`
**Views ops (P5.1):** `v_report_run_kpis_24h`, `v_report_run_failures_by_reason_24h`

---

## 2. SLOs e limiares

| Métrica | Warning | Page |
|---|---|---|
| Heartbeat do scheduler (última run started_at) | > 5 min | > 15 min |
| Storage/sign error rate (1h) | ≥ 5% | ≥ 20% |
| Runs presos em `running` | idade > 5 min | idade > 15 min OU >3 runs |
| Failures por reason (15 min) | ≥ 3 mesma reason | ≥ 10 mesma reason |
| Schedules atrasados (`next_run_at` passado) | > 5 e >5 min | > 20 ou atraso > 30 min |
| Resign rate-limit saturation (24h) | resign_count ≥ 7 | resign_count ≥ 10 |

Fonte oficial de queries: [`supabase/sql/p5_health_probes.sql`](../supabase/sql/p5_health_probes.sql).
Diagnóstico ad-hoc: [`supabase/sql/p5_ops_queries.sql`](../supabase/sql/p5_ops_queries.sql).

---

## 3. Reasons canônicos

Definidos em `supabase/functions/_shared/report-export/errorCodes.ts`.

| Reason | Classe | Retry? |
|---|---|---|
| `invalid_view_state` | **Definitivo** | ❌ |
| `row_limit_exceeded` | **Definitivo** | ❌ |
| `run_timeout` | Transitório | ✅ (backoff) |
| `scope_query_failed` | Transitório | ✅ |
| `artifact_generation_failed` | Transitório | ✅ |
| `upload_failed` | Transitório | ✅ |
| `sign_failed` | Transitório | ✅ |
| `delivery_skipped` | Informacional (noop) | — |
| `unknown` | Fallback | ✅ |

Definitivo = a run marca `failed` e `next_run_at` avança para o próximo slot regular, **sem** backoff. Não reexecuta a mesma janela.

---

## 4. Playbooks por incidente

### 4a) Cron parado

**Sinal:** PROBE 1 (`heartbeat_lag`) > 15 min e/ou PROBE 6 mostrando fila crescente.

Passos:
1. Confirmar: rodar PROBE 1 e PROBE 6 do `p5_health_probes.sql`.
2. Checar `supabase edge_function_logs` de `run-report-schedules` — buscar `batch_started` recente.
3. Se sem logs: cron não está disparando → verificar `pg_cron` job (`SELECT * FROM cron.job`).
4. Recuperação: invocar manualmente `run-report-schedules` (via curl/dashboard) para drenar a fila.
5. Reabilitar cron; observar PROBE 1 voltar < 5 min.

**Rollback:** N/A (não afeta usuários finais imediatamente).

---

### 4b) Explosão de failed runs

**Sinal:** PROBE 4 acusa reason específica com pico ≥ 10 em 15 min.

Passos por reason:
- **`row_limit_exceeded`** (definitivo): usuário está pedindo dataset > cap. Contatar o owner do schedule; considerar reduzir escopo (filtros de data) ou trocar formato (CSV suporta 100k, PDF só 5k).
- **`run_timeout`**: dataset grande + queries lentas. Checar `pg_stat_statements` para queries lentas na tabela alvo. Não desativar retries — o pipeline reagenda com backoff.
- **`scope_query_failed`**: geralmente RLS/permissão. Ver `error_message` completo em `report_schedule_runs.error_message`.
- **`upload_failed` / `sign_failed`**: Storage indisponível → 4c.
- **`artifact_generation_failed`**: bug em exportCsv/Xlsx/Pdf server. Investigar payload.

**Rollback:** se pico persistir e vier de release recente do edge function, reverter último deploy.

---

### 4c) Storage/sign com falha

**Sinal:** PROBE 2 (`storage_error_rate_pct`) ≥ 20% ou spike específico em `upload_failed`/`sign_failed`.

Passos:
1. Verificar status do storage no dashboard do Cloud.
2. Confirmar existência do bucket `report-exports` e políticas RLS do bucket.
3. Testar upload manual via service_role em um path de sanity.
4. Se storage OK e falhas persistem: checar cotas do bucket.

**Rollback:** nenhuma ação de código; incidente é infra.

---

### 4d) Timeout recorrente

**Sinal:** PROBE 4 mostra `run_timeout` como top reason (≥ 3 em 15 min).

Passos:
1. Identificar schedules afetados (query `p5_ops_queries.sql` — failures 24h).
2. Ver tamanho médio do dataset. Se próximo dos caps (P5.3), considerar filtros mais restritos no `view_state`.
3. Se generalizado, pode indicar degradação do banco → checar `db_health` / slow queries.
4. **NÃO** aumentar `RUN_TIMEOUT_MS` sem análise — 90s é orçamento consciente.

**Rollback:** N/A. Retry automático absorve incidentes curtos.

---

### 4e) Rate-limit de resign saturado

**Sinal:** PROBE 5 mostra runs com `resign_count >= 10`.

Passos:
1. Contatar owner (`user_id` da run) — link expirando muito rápido pode indicar TTL curto ou reencaminhamentos.
2. Aguardar reset diário (janela de 24h no logic.ts do resign endpoint).
3. Se abuso legítimo (ex.: usuário perdeu o e-mail várias vezes): regerar o schedule para um novo run.

**Rollback:** desabilitar o schedule temporariamente (`enabled=false`).

---

## 5. Rollback global (DELIVERY_PROVIDER)

O provider já está em `noop`. Se, no futuro, um provider real for ativado e detonar incidente:

1. **Ação imediata**: setar `DELIVERY_PROVIDER=noop` nas Edge Function secrets.
2. **Redeploy**: automático via Lovable Cloud (não requer intervenção humana adicional).
3. **Tempo esperado**: < 3 min do flip até novos runs saírem em `delivery_status=skipped`.
4. **Verificação**: rodar PROBE 1 pós-flip; ver runs recentes com `delivery_status = 'skipped'`.

Isso não afeta a geração de artefato nem o signed URL. Usuários continuam podendo baixar via UI.

---

## 6. Checklists

### D-1 (véspera de mudança)
- [ ] Suíte de testes verde (`bunx tsgo --noEmit`, `bunx vitest run`, `deno test`).
- [ ] Health probes executáveis sem erro.
- [ ] Backup lógico da tabela `report_schedules` (dump do estado dos schedules ativos).
- [ ] Confirmar `DELIVERY_PROVIDER=noop` nos secrets de produção.
- [ ] Confirmar bucket `report-exports` existente e com políticas RLS ativas.

### D-day
- [ ] Congelar novos schedules 30 min antes da janela.
- [ ] Deploy monitorado com dashboard aberto (`/configuracoes/relatorios-ops` — P5.1).
- [ ] Após deploy: PROBE 1 volta < 2 min, PROBE 3 não cresce.

### D+1
- [ ] Revisar `v_report_run_kpis_24h` — success rate ≥ baseline anterior.
- [ ] PROBE 4 sem picos anômalos.
- [ ] Resign endpoint respondendo (checar log `resign-report-run`).
- [ ] Nenhum ticket aberto ligado a export atrasado.

---

## 7. Queries prontas

| Cenário | Arquivo | Probe/Query |
|---|---|---|
| Diagnóstico incidente | `supabase/sql/p5_health_probes.sql` | PROBES 1–6 |
| Análise ad-hoc / relatório 24h | `supabase/sql/p5_ops_queries.sql` | KPIs, failures by reason, runs por schedule |
| Logs do edge function | Lovable Cloud → Functions → `run-report-schedules` / `resign-report-run` | Filtrar `event=run_failed` |

---

## 8. Contatos e escalonamento

- **Owner do módulo:** Backend/SRE (canal interno).
- **Escalation Page:** apenas se PAGE thresholds violados por > 10 min consecutivos.
- **Comunicação com usuários:** somente após confirmação de incidente (PROBE + logs).
