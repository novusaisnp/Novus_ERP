# Runbook Fiscal — Novus ERP

Ações operacionais frequentes para o módulo fiscal. Todos os comandos assumem
`FISCAL_MOCK=true` salvo indicação em contrário.

## Executar smoke test em modo mock

### Pela UI (recomendado)

1. Acesse **Fiscal → Dashboard Fiscal** (admin-only, rota `/fiscal/dashboard`).
2. Role até o card **"Rodar smoke mock"**.
3. Cole o UUID de uma venda faturada e clique **Rodar smoke mock**.
4. Toast confirma sucesso; o documento aparece nos KPIs e nos eventos da venda em segundos.

### Via CLI (automação)

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

## Alertas ativos

Os 4 alertas abaixo são **regras ativas**, avaliadas pela edge function
`evaluate-ops-alerts` (cron `*/5 * * * *`). Cada uma faz uma checagem SQL
específica no banco e escreve/atualiza linhas em `report_ops_alerts`. Podem
ser inspecionadas no card **"Alertas fiscais ativos"** do Dashboard Fiscal.

| kind | Condição (severity `warning` → `page`) | Ação recomendada |
| --- | --- | --- |
| `fiscal_processando_stuck` | ≥1 doc em `processando` há >10 min → `warning`; >5 docs ou idade >30 min → `page` | Investigar via **Dashboard Fiscal → "Em processamento há mais de 10 min"** e clicar **Reprocessar**. Em mock, sempre indica bug. |
| `fiscal_rejeicao_alta` | Taxa `rejeitada+denegada+erro / total` em 1h ≥5% (amostra ≥5) → `warning`; ≥20% → `page` | Abrir NF-e recentes rejeitadas, revisar mapper `vendaToNFePayload` e dados da venda/cliente. |
| `fiscal_erro_edge` | ≥3 eventos `erro_emissao/erro_cancelamento/erro_cce` em 15 min → `warning`; ≥10 → `page` | Ver logs das edge functions fiscais; conferir secrets e conectividade se real. |
| `fiscal_certificado_expira` | ≥1 certificado A1 com `validade_ate` <30 dias → `warning`; <7 dias → `page` | Reemitir/renovar certificado e reupload via **Fiscal → Certificados**. |

**Resolver manualmente** (após tratar a causa raiz):

```sql
UPDATE public.report_ops_alerts
SET resolved_at = now()
WHERE id = '<alert_id>';
```

Alertas se auto-resolvem quando a condição deixa de ser satisfeita na próxima
avaliação, então preferir corrigir a causa em vez de forçar `resolved_at`.

