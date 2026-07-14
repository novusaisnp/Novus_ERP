# Runbook Fiscal — Novus ERP

Ações operacionais frequentes para o módulo fiscal. Todos os comandos assumem
`FISCAL_MOCK=true` salvo indicação em contrário.

## Executar smoke test em modo mock

```bash
export VITE_SUPABASE_URL=...
export VITE_SUPABASE_PUBLISHABLE_KEY=...
export SMOKE_JWT=...        # JWT de um admin autenticado
export SMOKE_VENDA_ID=...   # id de uma venda faturada de teste
node scripts/fiscal/smoke-mock.mjs
```

Saída esperada: 3 linhas `ok: true` (`emitir`, `cce`, `cancelar`) e `step: done`.

## Reprocessar documento fiscal preso em `processando`

Pelo Dashboard Fiscal → tabela "Em processamento há mais de 10 min" → botão
**Reprocessar** (chama `fiscal-emitir-nfe` novamente com o mesmo `venda_id`).

Via SQL (fallback):

```sql
UPDATE public.fiscal_documentos_eletronicos
SET status = 'erro', motivo_rejeicao = 'reset manual — reprocessar'
WHERE id = '<documento_id>';
```

Depois clique em **Emitir NF-e** novamente na venda.

## Forçar refresh das métricas fiscais

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY public.fiscal_metrics_daily;
```

## Verificar últimos erros das edge functions

Dashboard Backend → **Edge Functions** → filtrar por `fiscal-*`. Cada linha
JSON estruturado contém `fn`, `event`, `code`, `documento_id`, `latency_ms`.

## Ativação real

Ver [`docs/FISCAL_ATIVACAO_PROVEDOR_REAL.md`](../FISCAL_ATIVACAO_PROVEDOR_REAL.md).

## Alertas

- **`fiscal_processando_stuck`** — documentos há >10 min em `processando` (em mock, sempre indica bug).
- **`fiscal_rejeicao_alta`** — >5% de rejeições em 1h.
- **`fiscal_erro_edge`** — >3 erros `INTERNAL_ERROR` em 15 min.
- **`fiscal_certificado_expira`** — certificado A1 expira em <30 dias.
