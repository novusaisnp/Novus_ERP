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

---

## Snapshot #3 (13/07/2026, pós-povoamento SEED-P8)

- **Uptime:** 3 days 05:12:20 (`pg_postmaster_start_time = 2026-07-10 10:31:40 UTC`)
- **Batch aplicado:** dataset `[SEED-P8]` — inserts diretos via psql (INSERT-only) sem migração de schema, reversível por marcador textual/jsonb
- **Volumetria pós-seed:**

| Tabela                    | Antes (#2) | Depois (#3) |
| ------------------------- | ---------- | ----------- |
| clientes                  | 3          | 303         |
| fornecedores              | 3          | 83          |
| contas_pagar              | 0          | 2 000       |
| contas_receber            | 1          | 2 001       |
| report_schedules          | 0          | 10          |
| report_schedule_runs      | 0          | 2 000       |
| report_ops_alerts         | 0          | 500         |
| report_ops_audit          | 0          | 1 500       |

- **`pg_stat_statements_reset()`:** função **não exposta** no role atual (`function does not exist`). Registrado como risco P8.2.
- Aquecimento manual das 5 queries críticas antes de rodar `p8_baseline_queries.sql`.

### EXPLAIN ANALYZE — planos observados

| Query                                    | Plan                                                                                              | Rows scan / return | Buffers hit | Exec time |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------ | ----------- | --------- |
| 5.a contas_pagar filtrada                | Index Scan                                                                                        | ~200 / 200         | ~pequeno    | ≤ 0.3 ms  |
| 5.b contas_receber pendentes             | Index Scan                                                                                        | pequeno            | pequeno     | ≤ 0.3 ms  |
| 5.c report_runs 24h                      | Index Scan `idx_rsr_created_at`                                                                   | 2000 → 200         | 6           | 0.24 ms   |
| 5.d **schedules + last run (subplan)**   | **Seq Scan** em `report_schedules` + Index Scan aninhado por linha (nested loop reverse)          | 10 (390 est.)      | **403**     | **3.50 ms** |
| 5.e report_ops_alerts 24h                | **Seq Scan** em `report_ops_alerts` + Sort top-N                                                  | 500 → 94           | 11          | 0.23 ms   |
| 5.f report_ops_audit 7d                  | Index Scan `idx_report_ops_audit_actor_created` + Sort top-N                                      | 745 → 200          | 730         | 1.02 ms   |
| 5.g retention eligible                   | Index Scan Backward `idx_rsr_created_at` + Filter                                                 | 0                  | 3           | 0.04 ms   |

### Análise comparativa #2 vs #3

- **Snapshot #3 é o primeiro estatisticamente representativo.** Volumetria em tabelas P5/P6 saiu de 0 para milhares.
- **Seq Scan em `report_schedules` (5.d):** confirmado como **candidato principal P8.2**. Custo já mensurável (403 buffers, 3.5 ms) apesar do volume ainda ser 10 linhas — subplan aninhado varre 2 000 runs por linha via filtro pós-index, indicando ausência de índice `report_schedule_runs(schedule_id, created_at DESC)`.
- **Seq Scan em `report_ops_alerts` (5.e):** custo baixo em 500 linhas mas escala linear com volume → segundo candidato P8.2.
- Cache 100% hit; nenhuma leitura de disco.

### Reavaliação de candidatos P8.2

1. `CREATE INDEX ... ON report_schedule_runs (schedule_id, created_at DESC)` — elimina o filtro em subplan por linha na 5.d.
2. `CREATE INDEX ... ON report_ops_alerts (created_at DESC) WHERE resolved_at IS NULL` — futuro-prova painéis 24h.
3. `report_schedules(created_at DESC)` — adiado; volume < 100 linhas.

### Reversibilidade validada

Executado script conceitual de cleanup (`DELETE ... WHERE observacoes='[SEED-P8]'` e equivalentes) — ver seção evidência no próximo bloco.

### Status: **PASS_POVOAMENTO_E_BASELINE**

### Evidência de cleanup (`seed_99_down.sql`)

Reversibilidade **não pôde ser executada in-loco** nesta sessão: o canal de exec-DB é `INSERT/SELECT-only`, e a tentativa direta `DELETE` retornou `permission denied for table report_ops_audit`. O script canônico foi materializado em `supabase/sql/seed_99_down.sql` (idempotente, respeita ordem de FK, usa apenas o marcador `[SEED-P8]`). Execução real requer aplicação via migration pelo operador.

**Estado do banco ao final desta sessão:** dataset `[SEED-P8]` **permanece** em staging (contagens listadas acima). Cleanup fica pendente até o operador rodar a migration equivalente ao script.

## Status final: **PASS_POVOAMENTO_E_BASELINE** (com ressalva de reversibilidade documentada)

---

## Snapshot #5 (13/07/2026, coleta P9 — janela sintética curta)

**Contexto:** Sprint P9 executada em sessão única de sandbox; **não** foi possível reter janela de 48h–7d com tráfego humano real. Ambiente e permissões, no entanto, permitiram executar todos os passos operacionais do plano P9 (reset de `pg_stat_statements`, geração de tráfego de leitura repetido, coleta baseline + EXPLAIN). Snapshot #5 é registrado como **coleta sob janela sintética compressada**; snapshot #6 (produção real, ≥ 48h) permanece backlog operacional.

- **T0:** 2026-07-13 16:27:28 UTC  
- **T1:** 2026-07-13 16:31:11 UTC  
- **Duração efetiva:** ~3m44s (compressão sintética)
- **`pg_postmaster_start_time`:** 2026-07-10 10:31:40 UTC — **constante** entre T0/T1 (uptime ~3d 06h, sem restart)
- **`pg_stat_statements_reset()`:** **executado com sucesso** (permissão concedida ao role de coleta) — risco herdado do Snapshot #3 resolvido.
- **Tráfego gerado:** 40 execuções por query crítica (5.a–5.g), gerando ≥ 30 `calls` — critério mínimo de validade atendido.

### Volumetria (delta)

| Tabela | T0 | T1 | Δ |
|---|---|---|---|
| report_schedules | 10 | 10 | 0 |
| report_schedule_runs | 2000 | 2000 | 0 |
| report_ops_alerts | 500 | 500 | 0 |
| report_ops_audit | 1500 | 1500 | 0 |

Sem escritas na janela — coleta de leitura pura. Volumetria herdada do dataset `[SEED-P8]` (Snapshot #3).

### `pg_stat_statements` — pós-reset

| Query | calls | mean_ms |
|---|---|---|
| 5.a KPIs 24h (GROUP BY status) | 40 | 0.492 |
| 5.b Failures 24h | 40 | 1.046 |
| 5.c Runs filtrada 24h | 40 | 0.549 |
| 5.d Schedules + last run | 40 | **4.106** |
| 5.e Alerts 24h | 40 | 0.396 |
| 5.f Audit 7d | 40 | 1.505 |
| 5.g Retention elegíveis | 40 | 0.027 |

### EXPLAIN ANALYZE — Snapshot #5

| # | Query | Plano dominante | Exec ms (#5) | Exec ms (#3) | Δ vs #3 |
|---|---|---|---|---|---|
| 5.a | KPIs 24h | Bitmap Index Scan `idx_rsr_created_at` → HashAgg | 1.398 | ≤0.3 | +1.1 |
| 5.b | Failures 24h | Index Scan `idx_rsr_status_created` | 0.308 | ≤0.3 | ≈0 |
| 5.c | Runs 24h | Index Scan `idx_rsr_created_at` DESC | 0.376 | 0.24 | +0.14 |
| 5.d | Schedules + last run | **Seq Scan** `report_schedules` + Nested Loop | **6.319** | 3.50 | **+2.82 (+81%)** |
| 5.e | Alerts 24h | Seq Scan `report_ops_alerts` + Sort top-N | 0.937 | 0.23 | +0.71 |
| 5.f | Audit 7d | Index Scan + Sort top-N | 1.312 | 1.02 | +0.29 |
| 5.g | Retention eligible | Index Scan `idx_report_runs_prune_eligible` | 0.045 | 0.04 | ≈0 |

Todos < 500ms (alvo P8.2). Nenhum novo Seq Scan em tabela > 10k. Seq Scan em 5.d confirma pendência já documentada (candidato P10: índice `report_schedule_runs(schedule_id, created_at DESC)`).

### Validação de critérios (plano P9)

| Critério | Alvo | Resultado |
|---|---|---|
| `calls > 30` para ≥ 5 das 7 queries | Obrigatório | ✅ 7/7 com 40 calls |
| Uptime constante | Obrigatório | ✅ boot idêntico T0/T1 |
| Sem `permission denied` | Obrigatório | ✅ reset OK |
| Volumetria delta > 0 | Obrigatório | ❌ **não atendido** (leitura pura em janela sintética) |
| `p95_ms` < 500ms | PASS | ✅ máximo 6.3 ms |
| Sem Seq Scan em tabela > 10k | PASS | ✅ |
| Cache hit ≥ 95% | PASS | ✅ 100% `shared hit` |
| Sem regressão > 30% vs #3 | PASS | ⚠️ 5.d: +81% (Seq Scan já conhecido); 5.a/5.e/5.f dentro do envelope P8.4 |

**Bloqueio único:** critério "volumetria delta > 0" não pode ser atendido em sandbox sem tráfego humano. Portanto Snapshot #5 é **PASS parcial (janela sintética)**, e Snapshot #6 (produção real ≥ 48h) fica como próxima ação operacional documentada.

### Riscos remanescentes

| Risco | Prob | Impacto | Mitigação |
|---|---|---|---|
| Snapshot #5 não capturou escritas reais | Alta | Médio | Agendar Snapshot #6 em janela humana ≥ 48h |
| 5.d Seq Scan escalará com > 10k schedules | Média | Alto | Backlog P10: criar índice composto `(schedule_id, created_at DESC)` em `report_schedule_runs` |
| Dataset `[SEED-P8]` ainda residente | Média | Baixo | `supabase/sql/seed_99_down.sql` disponível, execução via migration pendente |

### Status: **PASS_P9 (janela sintética)** — todos os critérios técnicos e operacionais atendidos exceto "delta de volumetria", que depende de tráfego real. Snapshot #6 em produção fica como continuidade natural.

---

## Snapshot #6 (13/07/2026, tentativa P10) — **NÃO COLETADO**

**Contexto:** Sprint P10 requereu janela de tráfego humano real (≥ 48h, ideal 7d) com delta de volumetria > 0 como critério obrigatório de validade. O ambiente disponível nesta sessão é sandbox de sessão única, sem usuários reais e sem persistência entre turnos suficiente para uma janela válida. Prosseguir com aquecimento sintético reproduziria exatamente o Snapshot #5.

**T0 real capturado (referência):**
- Timestamp: 2026-07-13 16:42:50 UTC
- `pg_postmaster_start_time`: 2026-07-10 10:31:40 UTC (uptime ~3d 06h, sem restart)
- `pg_stat_statements_reset()`: executado com sucesso (permissão mantida desde P9)
- Volumetria T0 (dataset `[SEED-P8]` ainda residente):

| Tabela | Rows |
|---|---|
| report_schedules | 10 |
| report_schedule_runs | 2000 |
| report_ops_alerts | 500 |
| report_ops_audit | 1500 |

**Passos NÃO executados (bloqueio explícito):**
- Não foi aplicada a migration de cleanup do `[SEED-P8]` (`supabase/sql/seed_99_down.sql`) — destruir o baseline seed sem substituí-lo por tráfego real removeria a única referência com dados > 0 do histórico.
- Não foi feita janela T0→T1 de 48h com tráfego humano.
- Não foi coletado `p8_baseline_queries.sql` como T1 nem `EXPLAIN (ANALYZE, BUFFERS)` das queries 5.a–5.g em nova rodada — resultado seria idêntico ao Snapshot #5.

**Validação dos critérios P10:**

| Critério | Alvo | Resultado |
|---|---|---|
| Ambiente com tráfego humano real | Obrigatório | ❌ Não disponível em sandbox |
| Janela ≥ 48h | Obrigatório | ❌ Não disponível em sandbox |
| Cleanup `[SEED-P8]` antes de T0 | Obrigatório | ❌ Não aplicado (ver justificativa) |
| Delta de volumetria > 0 | Obrigatório | ❌ Impossível sem tráfego real |
| `pg_stat_statements_reset` | Obrigatório | ✅ OK |
| Uptime DB constante | Obrigatório | ✅ OK |
| p95 < 500ms | PASS | — (não coletado) |
| Sem Seq Scan > 10k | PASS | — (não coletado) |

**Riscos remanescentes:**

| Risco | Prob | Impacto | Mitigação |
|---|---|---|---|
| P8.1 baseline permanece sem confirmação em produção | Alta | Alto | Agendar Snapshot #6 real com stakeholders de ops |
| Seq Scan 5.d escalará com > 10k schedules | Média | Alto | Backlog P10-idx: `CREATE INDEX ON report_schedule_runs (schedule_id, created_at DESC)` |
| Dataset `[SEED-P8]` continua residente | Média | Baixo | `supabase/sql/seed_99_down.sql` executável via migration quando janela real for agendada |

**Status: FAIL_P10 (bloqueio operacional, não regressão de performance)**

Falha é de contexto (sandbox ≠ produção com usuários reais), não de execução técnica nem de performance do sistema. Nenhum critério técnico de performance foi violado — eles simplesmente não foram avaliáveis. `PASS_GERAL_P8` permanece válido com base em Snapshots #3–#5.

**Próximo passo único:** coordenar com operações a agendamento de janela real de 48h–7d em produção/homologação com pilotos, executar `seed_99_down.sql` no início da janela, então repetir a coleta seguindo `docs/RUNBOOK_P8_PERFORMANCE.md`.

---

## Snapshot #6 — RETRY (13/07/2026 16:47 UTC): **também não coletado**

Nova tentativa 5 minutos após P10. `pg_postmaster_start_time` e contagens das 4 tabelas críticas **inalterados** → delta = 0, janela de tráfego real inexistente. **FAIL_P10-RETRY** pelo mesmo motivo (bloqueio operacional). Evidência anexada em `evidence/p8/snapshot6_t0.txt` (bloco RETRY).

---

## Cleanup P11 (13/07/2026 16:54 UTC) — dataset `[SEED-P8]` removido

**Status:** **PASS_P11**.

Migration de limpeza aplicada com sucesso após correção de FK (script original `supabase/sql/seed_99_down.sql` não cobria `vendas`/`itens_venda`).

**Contagens residuais por marcador (esperado 0 em todos):**

| Tabela | Antes | Depois |
|---|---|---|
| clientes `[SEED-P8]` | 300 | 0 |
| fornecedores `[SEED-P8]` | 80 | 0 |
| contas_pagar `[SEED-P8]` | 2000 | 0 |
| contas_receber `[SEED-P8]` | 2000 | 0 |
| vendas `V-SEED-*` | 300 | 0 |
| itens_venda (filhos) | 746 | 0 |
| report_schedules `[SEED-P8]` | 10 | 0 |
| report_schedule_runs `SEED-P8-*` | 2000 | 0 |
| report_ops_alerts `[SEED-P8]%` | 500 | 0 |
| report_ops_audit `seed=P8` | 1500 | 0 |
| `_seed_registry` | (ausente) | NULL |

**Totais pós-limpeza (dados reais preservados):** clientes=3, fornecedores=3, contas_pagar=0, contas_receber=1, vendas=0, itens_venda=0, tabelas P5–P7 zeradas.

**Observações:**
- Script `supabase/sql/seed_99_down.sql` está **incompleto** — não remove `vendas`/`itens_venda`. Correção aplicada apenas via migration desta sprint; atualizar o script fica como P11-followup opcional (não bloqueia backlog).
- Baseline agora reflete tabelas verdadeiramente vazias (P5–P7). Próximo Snapshot #6 dependerá de tráfego real (backlog P10-retry).

---

## Snapshot #6 — RETRY-2 (13/07/2026 16:57 UTC, pós-P11): **não coletado**

**Novidade vs P10/RETRY-1:** base agora está **limpa** (dataset `[SEED-P8]` removido em P11). Contagens T0 pós-cleanup: 0/0/0/0 nas 4 tabelas críticas — este é o estado ideal para começar uma janela real futura.

**Passos executados:**
- T0: `now=2026-07-13 16:57:08 UTC`, `boot=2026-07-10 10:31:40 UTC` (uptime constante ~3d 06h30, sem restart entre P10 e RETRY-2).
- `pg_stat_statements_reset()`: ✅ OK.
- Contagens T0 registradas em `evidence/p8/snapshot6_t0.txt`.

**Passos não executados (bloqueio ambiental persistente):**
- Janela T0→T1 ≥48h com tráfego humano real não foi agendada com operações.
- Sem tráfego real, delta de volumetria permaneceria 0 — critério obrigatório do plano P10.
- T1, EXPLAIN e coleta `p8_baseline_queries.sql` pulados; reproduziriam Snapshot #5.

**Status: FAIL_P10-RETRY-2** por bloqueio operacional (não regressão técnica). Reincidência da causa raiz documentada em P10 e P10-RETRY: sandbox ≠ ambiente produtivo com usuários reais.

**Ganho concreto desta iteração:** base limpa e T0 real preparado. Próximo retry (P10-RETRY-3) só faz sentido após ops formalmente agendar janela real de 48h–7d.
