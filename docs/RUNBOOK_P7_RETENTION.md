# RUNBOOK P7 — Retenção de Artefatos de Relatórios

> Escopo: expurgo automático dos arquivos `report-exports` após janela de retenção. Não altera geração de relatórios, alertas ou auditoria.

## 1. Política de retenção

| Parâmetro         | Valor              | Fonte                                                        |
| ----------------- | ------------------ | ------------------------------------------------------------ |
| Janela            | **30 dias**        | `RETENTION_DAYS` em `supabase/functions/_shared/report-export/retention.ts` |
| Tamanho de lote   | **200 runs/execução** | `BATCH_SIZE` idem                                         |
| Reason canônico   | `retention_expired`| `RETENTION_REASON` idem                                      |
| Frequência        | 1× ao dia, 03:15 UTC | `supabase/sql/p7_prune_cron.sql`                          |
| Elegíveis         | `status='succeeded' AND artifact_path IS NOT NULL AND artifact_pruned_at IS NULL AND created_at < now() - 30d` |
| Executor          | Edge function `prune-report-artifacts` (service_role) |

## 2. Fluxo storage → DB e idempotência

Ordem por run elegível:

1. `storage.remove([artifact_path])` no bucket `report-exports`.
2. Se o storage retornar **404 / "not found"**, tratar como sucesso idempotente (`storage_missing++`) e prosseguir.
3. `UPDATE report_schedule_runs SET artifact_path=NULL, signed_url=NULL, signed_url_expires_at=NULL, artifact_pruned_at=now(), artifact_prune_reason='retention_expired' WHERE id=? AND artifact_pruned_at IS NULL`.

Garantias:

- **Idempotência**: o filtro `artifact_pruned_at IS NULL` no UPDATE impede reprocessamento; segunda execução do cron sobre o mesmo run é no-op.
- **Convergência após falha DB**: se o storage foi removido mas o UPDATE falhou, a run permanece elegível; a próxima execução recupera com 404 idempotente e completa o UPDATE.
- **Sem logs sensíveis**: `console.log` emite apenas `run_id`, contadores e stage. `signed_url`/`artifact_path` nunca aparecem em campo destacado.

## 3. Playbook de incidente

### 3.1 Cron não executando

Sintomas: query `(a)` retorna zero em 48h+ e `(b)` cresce.

1. Verificar job: `SELECT * FROM cron.job WHERE jobname='prune-report-artifacts-daily';`
2. Verificar últimas execuções: `SELECT * FROM cron.job_run_details WHERE jobid=... ORDER BY start_time DESC LIMIT 10;`
3. Se `status='failed'`, ler `return_message`.
4. Reagendar reexecutando `supabase/sql/p7_prune_cron.sql` (contém `cron.unschedule` implícito se rodado após remover).
5. Executar 1× manualmente: `curl -X POST -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>" https://<project>.supabase.co/functions/v1/prune-report-artifacts`.

### 3.2 Backlog crescente

Sintomas: query `(b)` sobe dia após dia.

1. Confirmar cron ativo (§3.1).
2. Calcular backlog vs. lote: se `elegiveis_pendentes > BATCH_SIZE`, agendar execuções extras (a cada 30 min por 2–3 h) até normalizar.
3. Monitorar logs da função: `supabase functions logs prune-report-artifacts`.
4. Investigar erros por `stage='storage'` (bucket/permissão) ou `stage='db'` (RLS/lock).

### 3.3 Falha DB após delete no storage

Sintoma esperado: `errors[stage='db']` no summary de uma run.

1. A run afetada continua elegível (artifact_pruned_at ainda NULL).
2. Próxima execução do cron:
   - `storage.remove` retorna 404 → contabilizado em `storage_missing`.
   - UPDATE do DB é executado (nada obsta agora) → run passa a `pruned=+1`.
3. Verificar 24 h depois com query `(a)` que os prunados 24 h subiram.

## 4. Checklists

### D-1 (antes de agendar)

- [ ] Migration P7.1 aplicada (`artifact_pruned_at`, `artifact_prune_reason`, índice parcial)
- [ ] Extensões `pg_cron` e `pg_net` habilitadas
- [ ] Deploy da edge function `prune-report-artifacts` confirmado
- [ ] `deno test supabase/functions/prune-report-artifacts/index_test.ts` verde

### D-day (agendamento)

- [ ] `psql` como operador executa `supabase/sql/p7_prune_cron.sql`
- [ ] `SELECT * FROM cron.job WHERE jobname='prune-report-artifacts-daily';` retorna 1 linha
- [ ] Chamada manual do endpoint retorna `{ ok: true, summary: {...} }`

### D+1 (verificação)

- [ ] Query `(a)` mostra `prunados_24h > 0` **ou** query `(b)` retorna 0 (sem backlog)
- [ ] Nenhum erro crítico em logs (`stage='storage'` que não seja 404)
- [ ] Query `(d)` só apresenta reason `retention_expired`

## 5. Rollback operacional (pausar cron)

Rollback é **operacional**, não de schema — os campos permanecem, apenas o expurgo é interrompido.

```sql
-- pausar
SELECT cron.unschedule('prune-report-artifacts-daily');

-- confirmar
SELECT * FROM cron.job WHERE jobname='prune-report-artifacts-daily';  -- deve retornar 0 linhas
```

Para reativar: reexecutar `supabase/sql/p7_prune_cron.sql`.

## 6. Referências

- Config: `supabase/functions/_shared/report-export/retention.ts`
- Edge function: `supabase/functions/prune-report-artifacts/index.ts`
- Testes Deno: `supabase/functions/prune-report-artifacts/index_test.ts`
- Cron manual: `supabase/sql/p7_prune_cron.sql`
- Queries operacionais: `supabase/sql/p7_retention_queries.sql`
- UI de estado prunado: `src/components/relatorios/ScheduleList.tsx` (badge "Arquivo removido por retenção")
