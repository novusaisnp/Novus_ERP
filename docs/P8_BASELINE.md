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

---

# P8.1 — Baseline #2 (segundo snapshot)

**Coletado em:** 2026-07-13 15:27:16 UTC
**`pg_postmaster_start_time()`:** 2026-07-10 10:31:40 UTC
**Uptime do servidor:** ~3 dias 04h55m (sem restarts desde o snapshot #1 — `pg_stat_statements` acumulado é contínuo).
**Janela efetiva de tráfego produtivo:** ambiente pré-produção; carga real sobre módulos P5–P7 permanece próxima de zero neste intervalo. Snapshot #2 registra o estado atual e serve como marco temporal antes de qualquer campanha de tráfego representativo.

## Volumetria — Snapshot #2

| Tabela                 | Total | Rows (aprox) | Δ vs #1 |
| ---------------------- | ----- | ------------ | ------- |
| `report_schedule_runs` | 72 kB | 0            | =       |
| `report_ops_alerts`    | 40 kB | 0            | =       |
| `report_ops_audit`     | 32 kB | 0            | =       |
| `report_schedules`     | 32 kB | 0            | =       |

Sem ingestão relevante entre snapshots; volumetria e distribuição idênticas.

## Tabela "antes" — Snapshot #2 (EXPLAIN ANALYZE)

| # | Query                                | Plano dominante                                              | Exec ms (#2) | Exec ms (#1) | Δ         |
| - | ------------------------------------ | ------------------------------------------------------------ | ------------ | ------------ | --------- |
| 5.a | `report_ops_kpis_24h`               | Bitmap Index Scan `idx_rsr_created_at` → HashAggregate       | 0.081        | 0.050        | +0.031    |
| 5.b | `report_ops_failures_24h`           | Index Scan `idx_rsr_status_created`                          | 0.037        | 0.036        | ≈0        |
| 5.c | `report_runs` filtrada (P6.4)       | Index Scan `idx_rsr_created_at` DESC                         | 0.033        | 0.032        | ≈0        |
| 5.d | Schedule list + last run            | **Seq Scan `report_schedules`** + subselect índice           | 0.119        | 0.058        | +0.061    |
| 5.e | `report_ops_alerts` 24h             | Index Scan `idx_report_ops_alerts_resolved_created`          | 0.040        | 0.125        | −0.085    |
| 5.f | `report_ops_audit` 7d               | Index Scan `idx_report_ops_audit_action_created`             | 0.051        | 0.069        | −0.018    |
| 5.g | Retention elegíveis (P7.3)          | Index Scan **`idx_report_runs_prune_eligible`** (parcial)    | 0.034        | 0.050        | −0.016    |

Todos os planos permanecem sub-milissegundo com `Buffers: shared hit` (nenhum `read` de disco). Nenhuma regressão material entre snapshots — variação dentro do ruído (< 0.15 ms).

## p50/p95 via `pg_stat_statements` — Snapshot #2

Consulta filtrada por tabelas críticas com `calls > 5` retornou **0 linhas**: o volume acumulado de chamadas para as queries P5–P7 permanece insuficiente para estatística de percentis significativa (mesmo com uptime de ~3 dias). Percentis reais dependem de tráfego produtivo real de usuários no módulo RelatoriosOps.

## Análise comparativa Snapshot #1 vs #2

| Dimensão                     | #1 (13/07 baseline inicial) | #2 (13/07 15:27, uptime 3d) | Conclusão                                             |
| ---------------------------- | --------------------------- | --------------------------- | ----------------------------------------------------- |
| Volumetria                   | 0 linhas úteis              | 0 linhas úteis              | Sem carga real; snapshots equivalentes                |
| Uso de índices               | 6/7 queries com Index Scan  | 6/7 queries com Index Scan  | Planner estável, seleção idêntica                     |
| Cache                        | 100% `shared hit`           | 100% `shared hit`           | Sem pressão de I/O                                    |
| Seq Scan detectado           | 5.d `report_schedules`      | 5.d `report_schedules`      | Candidato P8.2 mantido                                |
| Percentis pg_stat_statements | Não estatísticos            | Não estatísticos            | Bloqueio persistente — depende de tráfego real        |
| Regressões                   | —                           | Nenhuma                     | Nenhum plano trocou; variação < 0.15 ms (ruído)       |

**Candidatos P8.2 reavaliados:**
- **Mantido:** índice `report_schedules (created_at DESC)` — Seq Scan continua sendo o plano de 5.d; risco baixo porque a tabela tem 32 kB. Só justificar criação após tráfego real reproduzir custo elevado.
- **Adiado:** demais candidatos aguardam snapshot #3 sob carga produtiva.

## Riscos remanescentes

| Risco                                                     | Prob | Impacto | Mitigação                                                                 |
| --------------------------------------------------------- | ---- | ------- | -------------------------------------------------------------------------- |
| Snapshots #1 e #2 sem tráfego representativo              | Alta | Alto    | Coletar snapshot #3 após ingestão real (RelatoriosOps em produção)        |
| `pg_stat_statements.stats_reset` desconhecido             | Baixa| Médio   | Registrar `stats_reset` em snapshots futuros                              |
| Baseline poderá subestimar hotspots (planner pode mudar)  | Média| Médio   | Reavaliar EXPLAIN após tabelas atingirem > 10k linhas                     |

## Status final: **PASS_P8.1 (Snapshot #2)**

Execução bem-sucedida (`psql exit=0`), documentação atualizada com uptime, comparativo, candidatos reavaliados e riscos. Nenhum arquivo fora do escopo alterado. Snapshot #3 (sob carga produtiva real) permanece como condição para abrir P8.2.
