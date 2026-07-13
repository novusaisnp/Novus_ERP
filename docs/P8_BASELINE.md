# P8.1 — Baseline de performance (snapshot inicial)

**Coletado em:** 2026-07-13 (janela: instância recém-inicializada, tabelas praticamente vazias).
**Escopo:** queries críticas P5–P7 sobre `report_schedules`, `report_schedule_runs`, `report_ops_alerts`, `report_ops_audit`.
**Ferramentas:** `supabase/sql/p8_baseline_queries.sql`, `EXPLAIN (ANALYZE, BUFFERS)`, `extensions.pg_stat_statements` v1.11.

## Pré-requisitos operacionais

- `pg_stat_statements` — **habilitado** (schema `extensions`, versão `1.11`). Nenhuma ação adicional.
- Papel de execução: `postgres`/`service_role` (necessário para ler `pg_stat_statements`).

## Volumetria atual

| Tabela                 | Total | Rows (aprox) |
| ---------------------- | ----- | ------------ |
| `report_schedule_runs` | 72 kB | 0            |
| `report_ops_alerts`    | 40 kB | 0            |
| `report_ops_audit`     | 32 kB | 0            |
| `report_schedules`     | 32 kB | 0            |

> Baseline coletado em ambiente pós-migrations sem tráfego real. Recomenda-se recoletar após 24h de pico produtivo (ver Riscos).

## Tabela "antes" — Execution Time (EXPLAIN ANALYZE)

| # | Endpoint / query                                | Plano dominante                                              | Rows scanned | Rows returned | Buffers (hit/read) | Exec time (ms) | Fonte     |
| - | ----------------------------------------------- | ------------------------------------------------------------ | ------------ | ------------- | ------------------ | -------------- | --------- |
| 5.a | `report_ops_kpis_24h` (agregado por status)    | Bitmap Index Scan `idx_rsr_created_at` → HashAggregate       | 0            | 0             | hit=variável       | 0.05           | inline    |
| 5.b | `report_ops_failures_24h`                      | Index Scan `idx_rsr_status_created` → Limit                  | 0            | 0             | hit≈2              | 0.036          | inline    |
| 5.c | `report_runs` filtrada (P6.4)                  | Index Scan `idx_rsr_created_at` (DESC) → Limit               | 0            | 0             | hit≈2              | 0.032          | inline    |
| 5.d | Schedule list + last run (P5/P7.2)             | **Seq Scan `report_schedules`** + subselect índice           | 0            | 0             | hit=poucos         | 0.058          | inline    |
| 5.e | `report_ops_alerts` 24h                        | Index Scan `idx_report_ops_alerts_resolved_created` → Sort   | 0            | 0             | hit≈1              | 0.125          | inline    |
| 5.f | `report_ops_audit` 7d                          | Index Scan `idx_report_ops_audit_action_created` (por range) | 0            | 0             | hit=1              | 0.069          | inline    |
| 5.g | Retention elegíveis (>30d, P7.3)               | Index Scan **`idx_report_runs_prune_eligible` (parcial)**    | 0            | 0             | hit=2              | 0.050          | inline    |

### p50 / p95 via `pg_stat_statements`
- Coleta ativa em `pg_stat_statements`; tráfego atual insuficiente (`calls <= 5` na maioria) para percentis estáveis.
- Estatísticas relevantes já capturadas: `error_message`-based failure queries (1 call, mean 0.13 ms) e agregação `janela` com `started_at >= now() - 1h` (1 call, mean 0.05 ms).
- **Ação P8.2:** repetir queries 1 e 1b após 24h de produção real.

### Cache hit ratio
- Tabelas ainda com volumetria mínima → ratios não são conclusivos.
- `Buffers: shared hit=*` observados em todas as queries (nenhum `read=*` de disco), o que indica warm cache local; reavaliar sob carga.

### Índices utilizados (positivo)
- `idx_rsr_created_at`, `idx_rsr_status_created`, `idx_rsr_schedule_created` — cobrem os padrões de filtro P5/P6.
- `idx_report_runs_prune_eligible` (parcial, P7.1) — usado corretamente em retenção.
- `idx_report_ops_alerts_resolved_created`, `idx_report_ops_alerts_sev_created` — usados nas listagens.
- `idx_report_ops_audit_action_created`, `idx_report_ops_audit_actor_created` — usados em recorte por ação/ator.

### Candidatos observados (para P8.2)
- **5.d — schedule list**: `Seq Scan on report_schedules` combinado com subselect por schedule pode virar hotspot quando `report_schedules` crescer > 10k. Já existe `idx_report_schedules_next_run` (parcial) e `idx_report_schedules_user`, mas nenhum ordenado por `created_at DESC`. Candidato: índice `(created_at DESC)` — validar após P8.1 sob carga real antes de criar.

## Riscos remanescentes

| Risco                                                     | Prob | Impacto | Mitigação                                                                 |
| --------------------------------------------------------- | ---- | ------- | -------------------------------------------------------------------------- |
| Baseline coletado com tabelas vazias                      | Alta | Alto    | Recoletar após ≥ 24h de tráfego representativo (documentar 2ª rodada)      |
| `pg_stat_statements` sofre reset ao restart do servidor   | Média| Médio   | Registrar `pg_postmaster_start_time()` junto ao snapshot                    |
| `error_code` inexistente na tabela (schema real usa `error_message`) — já corrigido | Baixa | Baixo | Query corrigida; validada por execução real                                |
| Percentis via mean+stddev são estimativa, não distribuição real | Média | Baixo | Aceitável para triagem; refinar por amostragem em P8.2 se necessário |

## Próximo passo único
Executar 24h de tráfego representativo e re-rodar `supabase/sql/p8_baseline_queries.sql` → snapshot #2 registrado como seção "Baseline #2" neste documento antes de abrir P8.2.
