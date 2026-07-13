# RUNBOOK P8 — Performance & Manutenção Contínua

**Escopo:** operação contínua do banco Postgres/Supabase após P8.1 (baseline) e P8.2 (indexação).
**Ferramenta principal:** `supabase/sql/p8_maintenance_queries.sql` + `pg_stat_statements`.

---

## 1. Política de Autovacuum

- **Confiamos no autovacuum padrão** do Supabase (thresholds default: 20% dead + 50 linhas). Não alterar `autovacuum_*` no nível de tabela sem evidência de bloat crônico.
- **Rodar `VACUUM ANALYZE` manual** apenas em três cenários bem definidos:
  1. Logo após uma carga em massa (ex.: seed `[SEED-P8]`, importação ETL, backfill).
  2. Quando query 1 do `p8_maintenance_queries.sql` mostrar `dead_pct > 20%` em tabela com `n_live_tup > 50k`.
  3. Quando o planner escolher índice sub-ótimo após grande mudança de distribuição (ver P8.2 §5.d).
- Comando padrão (fora de transação):
  ```sql
  VACUUM (ANALYZE, VERBOSE) public.<tabela>;
  ```
- **Nunca** `VACUUM FULL` em produção sem janela de manutenção — trava exclusivamente a tabela.

---

## 2. Playbook — Degradação de Performance

### 2.1 Identificar
1. Rodar `psql -f supabase/sql/p8_maintenance_queries.sql`.
2. Verificar em ordem:
   - **§2** long-running queries — algo travado agora?
   - **§5** top statements por `total_exec_time` — quem consome mais CPU?
   - **§1** bloat — alguma tabela crítica com `dead_pct > 20%`?
   - **§3** staleness de estatísticas — `last_analyze` há mais de 7 dias em tabela crítica?
   - **§4** índices não usados — write amplification sem retorno.
3. Cruzar com `pg_stat_statements` (mean_exec_time, max_exec_time) para percentis.

### 2.2 Diagnosticar
- Isolar a query suspeita:
  ```sql
  EXPLAIN (ANALYZE, BUFFERS, VERBOSE) <query real>;
  ```
- Checar: Seq Scan em tabela > 10k linhas? `Rows Removed by Filter` alto? `Buffers: shared read` (miss de cache)?
- Se planner ignora índice existente → suspeitar de estatísticas: `ANALYZE public.<tabela>;` e re-executar.

### 2.3 Agir (ordem preferida — menos invasivo primeiro)
1. **ANALYZE** — corrige seleção de plano em ~70% dos casos pós-carga.
2. **Kill query travada** (bloqueio, deadlock ou runaway):
   ```sql
   SELECT pg_cancel_backend(<pid>);  -- gentil, tenta abortar
   SELECT pg_terminate_backend(<pid>); -- força, use só se cancel falhar
   ```
3. **Refactor da query** (LIMIT, filtros mais seletivos, remover N+1 no app).
4. **Novo índice** — apenas se passar no gate P8.2 (tabela > 10k linhas OU p95 > 300 ms, e sem índice equivalente existente). Criar via migration com `CREATE INDEX IF NOT EXISTS`.
5. **VACUUM ANALYZE** — se §1 mostrar bloat.

### 2.4 Registrar
Toda ação corretiva deve produzir um registro em `docs/P8_OPTIMIZATION.md` (append) contendo:
- Data/hora, operador, PID (se kill), query normalizada.
- `EXPLAIN ANALYZE` antes e depois.
- Ganho medido (ms, buffers, rows).
- Rollback aplicado (se houve).

---

## 3. Checklist de Manutenção Periódica

| Frequência    | Ação                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| **Diária**    | Alertas de long-running (query §2) via dashboard/on-call.                  |
| **Semanal**   | Rodar `p8_maintenance_queries.sql` completo; revisar §1, §4, §5.           |
| **Mensal**    | Revisar `docs/P8_BASELINE.md` vs realidade — atualizar Snapshot #N se drift > 30%. |
| **Trimestral**| Auditoria de índices não usados (§4) — remover os com `idx_scan=0` por 90d. |
| **Sob demanda** | Após grande carga/seed/backfill: `VACUUM ANALYZE` nas tabelas afetadas.  |

---

## 4. Rollback Operacional

### 4.1 Reverter índice novo (regressão de escrita ou plano pior)
```sql
DROP INDEX CONCURRENTLY IF EXISTS public.<nome_indice>;
```
- Executar fora de transação; `CONCURRENTLY` evita bloqueio.
- Se a migration original usou `CREATE INDEX` simples, criar migration de rollback com `DROP INDEX IF EXISTS`.
- Registrar em `docs/P8_OPTIMIZATION.md`: motivo, evidência antes/depois, decisão.

### 4.2 Reverter seed de dados (`[SEED-P8]` ou similar)
- Aplicar `supabase/sql/seed_99_down.sql` (idempotente, respeita ordem de FK).

### 4.3 Reverter mudança de estatísticas (`ALTER TABLE ... SET STATISTICS`)
```sql
ALTER TABLE public.<tabela> ALTER COLUMN <col> SET STATISTICS -1; -- volta ao default
ANALYZE public.<tabela>;
```

### 4.4 Reverter kill acidental
- Não há rollback direto de `pg_terminate_backend`. Mitigar: reexecutar a operação abortada; se era transação idempotente, seguro repetir.

---

## 5. Referências cruzadas

- `docs/P8_BASELINE.md` — baseline e snapshots.
- `docs/P8_OPTIMIZATION.md` — decisões de indexação P8.2 + log de ações corretivas.
- `supabase/sql/p8_baseline_queries.sql` — coleta de baseline.
- `supabase/sql/p8_maintenance_queries.sql` — coleta operacional recorrente.
- `supabase/sql/seed_99_down.sql` — rollback do seed.

---

## 6. Riscos remanescentes

| Risco                                                              | Prob | Impacto | Mitigação                                                        |
| ------------------------------------------------------------------ | ---- | ------- | ---------------------------------------------------------------- |
| Autovacuum default insuficiente sob alto churn                     | Baixa| Médio   | Monitorar §1 semanalmente; ajustar `autovacuum_vacuum_scale_factor` por tabela se necessário |
| `pg_stat_statements` reset por restart oculta hotspots históricos  | Média| Baixo   | Registrar `pg_postmaster_start_time` a cada snapshot             |
| Remoção prematura de índice "não usado" que serve caminhos raros mas críticos | Média| Alto | Antes de `DROP INDEX`, buscar em `pg_stat_statements` por queries que filtram pelas colunas indexadas |
| Kill de backend interromper transação financeira crítica           | Baixa| Alto    | Verificar `query` antes de `pg_terminate_backend`; preferir `pg_cancel_backend` |
