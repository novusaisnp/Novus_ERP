# Diagnóstico Real — Módulo Fiscal (NOVUS ERP)
Data: 2026-07-14 · Ambiente: homologação · `FISCAL_MOCK` implícito = **true** (default)

## 1. Configuração de Ambiente

| Item | Estado real | Observação |
|---|---|---|
| `FISCAL_MOCK` | **Não definido** nos secrets → código assume `true` | `Deno.env.get('FISCAL_MOCK') ?? 'true'` em `fiscal-emitir-nfe/index.ts` |
| `FISCAL_PROVIDER_API_KEY_HOM` | **Ausente** | Não listado em `fetch_secrets` |
| `FISCAL_WEBHOOK_SECRET` | **Ausente** | Não listado em `fetch_secrets` |
| `FISCAL_PROVIDER_BASE_URL` | Ausente | Default Focus NFe seria usado se ativo |
| Webhook Focus NFe | **Não aplicável** | Provedor real não conectado |

Secrets presentes no projeto: `E2E_ENABLED`, `E2E_PASS`, `LOVABLE_API_KEY`. Nenhum secret fiscal foi provisionado. Isso é **coerente com operar em mock**, mas significa que a Fase 4 "ativação real" continua totalmente pendente.

## 2. Funcionalidade End-to-End (Simulada)

### 2.1 `scripts/fiscal/smoke-mock.mjs`
- **Não executado nesta sessão.** O script exige `SMOKE_JWT` (JWT de admin) e `SMOKE_VENDA_ID` (venda faturada), variáveis que **não estão configuradas** no sandbox. Sai com `exit code 2` sem tocar em nada.
- Nenhum smoke run histórico deixou traços no banco (ver §2.3).

### 2.2 UI de Vendas
- Botões e diálogos existem: `EmitirNFeDialog`, `CancelarNFeDialog`, `CartaCorrecaoDialog`, `DetalheNFeDrawer`, `EventosTimeline`, `FiscalStatusBadge`.
- Wiring em `src/pages/vendas/Vendas.tsx` confirmado.
- Não foi possível exercitar a UI end-to-end automatizada nesta auditoria (requer usuário admin autenticado + venda faturada real).

### 2.3 Estado do banco (**crítico**)
```
SELECT status, COUNT(*) FROM fiscal_documentos_eletronicos WHERE deleted_at IS NULL → []
SELECT tipo, status, COUNT(*) FROM fiscal_eventos                                    → []
```
**Zero documentos, zero eventos.** Ou o mock nunca foi exercitado contra o banco real, ou a base foi limpa. Na prática, o fluxo simulado ainda não deixou pegada em produção do projeto.

## 3. Edge Functions — Comportamento Real

| Function | Estado |
|---|---|
| `fiscal-emitir-nfe` | Deploy ativo, boot ~140ms, ramo mock incondicional quando `FISCAL_MOCK != 'false'`. `resolveFiscalProvider` **nunca é chamado** no modo atual. Validação Zod/mapper presente (`VendaMapperError` → 422). |
| `fiscal-cancelar-nfe` | Deploy ativo. Justificativa mínima validada. Mock por default. |
| `fiscal-cce-nfe` | Deploy ativo. Correção mínima validada. Mock por default. |
| `fiscal-signed-url` | Deploy ativo. Gera signed URL do bucket — funcional mesmo com mock. |
| `fiscal-upload-certificado` | Deploy ativo. Aceita `.pfx`, grava metadata em `fiscal_certificados`. Funcional. |
| `run-report-schedules` (proxy de log observado) | Rodando batch a cada ~60s, `count: 0`. Não é fiscal, mas confirma que o cron layer está saudável. |

**Logs de erro inesperados:** nenhum nas últimas 40 execuções observadas. Apenas o warning padrão de Node 20 (irrelevante).

**Tentativas de chamada externa:** nenhuma. `FocusNFeProvider` existe mas não é instanciado.

## 4. Realtime & Observabilidade

- **Realtime:** `useFiscalDocumentoRealtime` inscreve em `postgres_changes` de `fiscal_documentos_eletronicos` e `fiscal_eventos`. Como não há dados, o canal está ocioso mas o wiring está correto (cleanup via `removeChannel`).
- **DashboardFiscal:** **NÃO ESTÁ ROTEADO** em `src/App.tsx`. Bloco `<Route path="fiscal">` contém apenas `notas-fiscais`, `sped`, `tributos`. `DashboardFiscal.tsx` é código morto no roteamento atual — só acessível se alguém importar manualmente.
- **KPIs:** dependem de `fiscal_metrics_daily` (view) e de `fiscal_documentos_eletronicos`. Sem dados no banco, o dashboard renderiza zeros. Não há bug — está corretamente vazio.
- **Alertas:** a migration `20260714005716_*` inseriu **1 linha para cada uma das 4 chaves** (`fiscal_processando_stuck`, `fiscal_rejeicao_alta`, `fiscal_erro_edge`, `fiscal_certificado_expira`) na tabela `report_ops_alerts`. **Importante:** essa tabela armazena *ocorrências* de alerta (colunas: `kind, severity, reason, payload, acknowledged_by, resolved_at`), **não regras/thresholds**. Não existe job avaliador que gere novas linhas para essas chaves — as 4 linhas atuais são apenas seeds de demonstração. Portanto:
  - ✅ Chaves catalogadas.
  - ❌ **Nenhum motor de avaliação está disparando alertas fiscais** (`evaluate-ops-alerts` não conhece as chaves fiscais — grep confirma que só a migration referencia esses nomes).
- **RPC `get_ultimo_documento_por_venda`:** existe em `public`, usada por `useFiscalStatusPorVenda`. OK.

## 5. Documentação

- `docs/FISCAL_ATIVACAO_PROVEDOR_REAL.md` ✅ presente e completo.
- `docs/fiscal/RUNBOOK.md` ✅ presente.
- `scripts/fiscal/smoke-mock.mjs` ✅ presente, porém não integrado a nenhum CI.

## 6. Resumo — Funcional vs Não-Funcional (na prática)

### ✅ 100% funcional em mock
- Estrutura de tabelas, RLS, triggers de `updated_at`, soft delete.
- Edge functions com autenticação, role check (`has_role admin`), validação Zod, idempotência via `idempotency_key`.
- Mapper `vendaToNFePayload` com erros tipados (422).
- UI de emissão/cancelamento/CC-e integrada em Vendas.
- Realtime wiring correto em `DetalheNFeDrawer`.
- Certificados: upload/armazenamento em bucket privado + signed URL.
- Documentação de ativação e runbook.
- Testes Deno/Vitest/Playwright presentes.

### ⚠️ Implementado mas **não exercitado / não observável**
- Fluxo mock end-to-end: **zero registros** em `fiscal_documentos_eletronicos` e `fiscal_eventos`. Ninguém rodou o smoke ou emitiu nota simulada contra este banco.
- `DashboardFiscal.tsx`: código completo, **fora do roteamento** (gap crítico de UX).
- Alertas fiscais: apenas linhas-semente; **sem avaliador ativo** — nunca dispararão automaticamente.
- `smoke-mock.mjs`: fora de qualquer pipeline; requer JWT/venda manualmente.

### ❌ Não-funcional (dependência externa — esperado)
- Emissão real na SEFAZ (Focus NFe): bloqueada por ausência de `FISCAL_PROVIDER_API_KEY_HOM`.
- Webhook `fiscal-webhook` de callback: não implementado (não há função com esse nome nos deploys).
- Download de XML/DANFE reais para Storage: mock apenas gera `mock://` URLs.
- Contingência EPEC/SVC-AN, inutilização de numeração: não implementadas.

## 7. Desvios entre Plano e Execução

| Plano (Fase 3/4) | Execução real |
|---|---|
| "Dashboard Fiscal aprimorado e roteado" | Componente existe, **rota ausente** em `App.tsx`. |
| "4 alertas configurados" | 4 linhas em `report_ops_alerts`, mas **não há regra/threshold nem avaliador**. Comunicação induziu a interpretação errada. |
| "Suite de testes completa e passando" | Arquivos existem; **execução real não verificada** nesta sessão. |
| "Smoke test em modo mock" | Script existe, **nunca rodou** contra este banco (0 registros históricos). |
| "Fase 4 pronta para ativação" | Correto no lado de código; **secrets do provedor ainda ausentes** — ativação real é 1 passo humano. |

## 8. Ações Mínimas para Fechar os Gaps Sem API

1. **Registrar rota** `fiscal/dashboard → DashboardFiscal` em `src/App.tsx`.
2. **Adicionar avaliador de alertas fiscais** em `evaluate-ops-alerts` (queries: docs `processando > 10min`, taxa de rejeição/h, contagem de `status='erro'`, certificados < 30d).
3. **Rodar `smoke-mock.mjs`** com uma venda faturada de teste e persistir o resultado — garante que o banco tem ao menos 1 documento + eventos para o Dashboard exibir dados reais.
4. **Documentar em README/RUNBOOK** que os "4 alertas" da migration são seeds, não regras ativas.
5. **CI:** wire de `bunx vitest run` fiscal + specs Deno fiscais + `smoke-mock` (opcional, com secrets de teste).

Depois desses 5 pontos, o módulo estará no **teto real** de prontidão sem provedor externo.
