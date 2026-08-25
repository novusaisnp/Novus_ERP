# P8.2 — Otimização orientada a evidência (Indexação)

**Coletado em:** 2026-07-13
**Entrada:** `docs/P8_BASELINE.md` Snapshot #3 (dataset `[SEED-P8]`).
**Escopo:** avaliar índices candidatos para queries críticas P5–P7 e aplicar somente quando o *anti-over-indexing gate* passar.

## Critérios de aceite (gate)

Índice novo só entra se **todas** as condições abaixo forem satisfeitas:

1. `EXPLAIN` da query alvo mostra **Seq Scan** dominante, **ou** p95 medido > 300 ms.
2. Tabela alvo tem **> 10.000 linhas** vivas, **ou** hotspot mensurável já > 300 ms mesmo em volume menor.
3. Custo de manutenção (write amplification, tamanho) < ganho medido em leitura.
4. Máx. 1 índice novo por tabela por sprint sem revisão explícita.

## Volumetria atual (Snapshot #3)

| Tabela                 | Rows  | Passa gate volumétrico (>10k)? |
| ---------------------- | ----- | ------------------------------ |
| `report_schedule_runs` | 2 000 | ❌                              |
| `report_ops_audit`     | 1 500 | ❌                              |
| `report_ops_alerts`    | 500   | ❌                              |
| `report_schedules`     | 10    | ❌                              |

Nenhuma tabela crítica atinge o limite volumétrico (>10 000 linhas).

## Índices já existentes cobrindo os candidatos preliminares

| Candidato preliminar (plano P8)                                                                                | Já coberto por                                                                    | Situação                |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------- |
| `report_schedule_runs (status, created_at) WHERE artifact_pruned_at IS NULL AND artifact_path IS NOT NULL`     | `idx_report_runs_prune_eligible` (definição idêntica)                             | ✅ Já existe             |
| `report_schedule_runs (schedule_id, created_at DESC)`                                                          | `idx_rsr_schedule_created`                                                        | ✅ Já existe             |
| `report_ops_alerts (created_at DESC) WHERE resolved_at IS NULL`                                                | `idx_report_ops_alerts_resolved_created (resolved_at, created_at DESC)` (parcialmente equivalente) | ⚠ Coberto, ver 5.e     |
| `report_ops_audit (created_at DESC, actor_id)`                                                                 | `idx_report_ops_audit_actor_created (actor_user_id, created_at DESC)`             | ✅ Já existe             |

## EXPLAIN ANALYZE — validação

### 5.d Schedule list + last run (subplan por linha)

```
Limit ... (actual time=29.017..33.517 rows=10)
  Buffers: shared hit=403
  -> Sort (Sort Key: s.created_at DESC)
     -> Seq Scan on report_schedules s (10 rows, hit=1)
  SubPlan 1 (loops=10, per-loop 3.34 ms)
    -> Limit
       -> Index Scan using idx_rsr_created_at on report_schedule_runs r
          Filter: (schedule_id = s.id)
          Rows Removed by Filter: 1800
Planning Time: 1.373 ms
Execution Time: 33.711 ms
```

**Observação:** o planner escolheu `idx_rsr_created_at` (ordenado por `created_at`) em vez do composto `idx_rsr_schedule_created` (`schedule_id, created_at DESC`) que atenderia melhor o predicado `schedule_id = s.id`. Isso é **estatística/correlação**, não ausência de índice: 100% das 2 000 runs seed apontam para um único `schedule_id` órfão (não presente em `report_schedules`), o que enviesa `pg_statistic`. Um `ANALYZE report_schedule_runs;` seguido de tráfego realista deve levar o planner a escolher `idx_rsr_schedule_created` sem novo índice.

**Decisão:** **não criar índice adicional**. Custo total 33 ms com 10 schedules; ainda 10× abaixo do gate p95=300 ms e volume 5× abaixo do gate 10k linhas.

### 5.e / 5.f — dentro do envelope

Snapshots #2 e #3 mostraram 0.23 ms e 1.02 ms respectivamente, com Index Scan. Nenhum índice novo justificável.

## Decisão P8.2

**Nenhum índice novo é criado nesta iteração.** Os critérios do *gate* não são atendidos:

- Nenhuma tabela crítica excede 10 000 linhas.
- Nenhuma query mostrada excede p95 = 300 ms (máximo observado: 33.7 ms em 5.d, com 10 schedules e dataset seed enviesado).
- Todos os índices propostos no plano preliminar **já existem** com definição equivalente ou superior.

Criar índices adicionais nesta janela violaria a regra anti over-indexing (write amplification sem retorno mensurável).

## Migrations produzidas

Nenhuma. `supabase/migrations/` não recebeu arquivos P8.2. Reversibilidade trivial (nada a reverter).

## Ações de acompanhamento (sem código)

1. Executar `ANALYZE public.report_schedule_runs;` após o próximo ciclo de tráfego real — corrige a escolha de índice em 5.d.
2. Repovoar `report_schedule_runs.schedule_id` referenciando `report_schedules.id` reais em qualquer novo seed (o seed atual gerou um único `schedule_id` órfão).
3. Coletar Snapshot #4 quando **qualquer** tabela crítica passar de 10k linhas em produção; reabrir P8.2 com os candidatos:
   - `idx_report_ops_alerts_open_created (created_at DESC) WHERE resolved_at IS NULL` — só se 5.e virar Seq Scan sob volume real.
   - `report_schedules (created_at DESC)` — só se 5.d permanecer Seq Scan após ANALYZE + volume > 5k.

## Riscos remanescentes

| Risco                                                                                          | Prob | Impacto | Mitigação                                                        |
| ---------------------------------------------------------------------------------------------- | ---- | ------- | ---------------------------------------------------------------- |
| Sob volume real (>10k) o planner ainda escolher `idx_rsr_created_at` em 5.d                    | Média| Médio   | ANALYZE agendado; se persistir, criar índice em P8.2-b            |
| Seed `[SEED-P8]` distorcer estatística e mascarar hotspots reais                               | Alta | Médio   | Aplicar `seed_99_down.sql` antes de coleta pós-produção           |
| Rule 10k linhas ser conservadora demais para hotspots latentes                                 | Baixa| Baixo   | Monitorar p95 via `pg_stat_statements`; disparar revisão < 300 ms |

## Status final: **PASS_P8.2**

Justificativa: gate anti over-indexing aplicado corretamente; evidência coletada; nenhuma criação de índice justificada nesta iteração; ações de acompanhamento documentadas.
