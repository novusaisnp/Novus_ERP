# SYSTEM AUDIT — NOVUS ERP Modular

**Data:** 2026-07-13
**Versão de referência:** pós P8 (Sprint P8 fechada — `docs/P8_SPRINT_CLOSEOUT.md` = PASS_GERAL_P8)
**Stack:** React 18 + Vite 5 + TypeScript strict · Tailwind + shadcn/ui · Supabase (Postgres + Auth + Storage + Edge Functions Deno)

---

## 1. Visão geral

**Propósito:** ERP modular multiempresa para operação de PMEs, cobrindo Vendas, Financeiro, Gestão Bancária, Estoque, RH, Fiscal, Contratos e Configurações. Multi-tenant via `empresa_representada_id` com RLS rigorosa e auditoria imutável.

**Público-alvo:** operadores administrativos, financeiros e gerenciais das empresas representadas (ex.: LIGNUM).

**Módulos funcionais (top-level do sidebar):**
1. Dashboard
2. Cadastros (Clientes, Fornecedores, Serviços)
3. Estoque (Produtos, Categorias, Localizações, Un. Medida, Tamanhos, + itens EmBreve)
4. Vendas (Pedidos, Orçamentos, Contratos, Relatórios)
5. Gestão Bancária (Bancos, Agências, Contas Bancárias, Movimentações)
6. Financeiro (Contas a Pagar/Receber, Movimentações Financeiras, Fluxo de Caixa, Fluxo por Competência, Centros de Custo, Plano de Contas, Config. Básicas, Relatórios)
7. Fiscal (Notas Fiscais, SPED, Tributos)
8. RH (Colaboradores, Cargos, Depto, Folha, Vencimentos/Descontos/Benefícios/Integração Ponto, Registros de Ponto, Relatórios)
9. Integração (Sync Dashboard)
10. Configurações (Empresas, Usuários, Perfil, Sistema, Webhooks, Regras de Classificação, Relatórios Ops)

---

## 2. Módulos e funcionalidades implementadas

### 2.1 Vendas
| Funcionalidade | Status | UX/UI | Impacto | Sprint |
|---|---|---|---|---|
| Pedidos de venda | ✅ Ativo | `Vendas.tsx`, `VendaFormModal`, `VendaPagamentoSection` | Núcleo transacional | P1–P3 |
| Orçamentos + conversão em venda | ✅ Ativo | `Orcamentos.tsx`, `OrcamentoViewDialog`, `ConverterVendaDialog` (RPC `converter_orcamento_em_venda`) | Fluxo comercial completo | P2 |
| Catálogo de itens (produto/serviço) | ✅ Ativo | `CatalogoItemPicker` | Reuso entre venda/orçamento | P2 |
| Geração de contas a receber a partir da venda | ✅ Ativo | `GerarTitulosButton` (RPC `gerar_contas_receber_da_venda`) | Automação financeira | P3 |
| Classificação contábil por rateio | ✅ Ativo | `RegraClassificacaoModal`, tabela `venda_parcela_classificacao_receita` | Contabilização precisa | P3 |
| Relatórios de vendas | ✅ Ativo | `pages/vendas/Relatorios.tsx` | KPIs comerciais | P4 |

### 2.2 Financeiro
| Funcionalidade | Status | UX/UI | Impacto | Sprint |
|---|---|---|---|---|
| Contas a pagar/receber (CRUD, rateios, recorrência) | ✅ Ativo | `ContasPagar.tsx`, `ContasReceber.tsx`, `useContasPagarForm` | Ciclo AP/AR | P1–P3 |
| Movimentações financeiras | ✅ Ativo | `MovimentacoesFinanceiras.tsx` | Histórico transacional | P2 |
| Fluxo de caixa | ✅ Ativo | `FluxoCaixaPage.tsx`, `useFluxoCaixa`, `useFluxoCaixaExport` | Liquidez | P3 |
| Fluxo por competência | ✅ Ativo | `FluxoCompetenciaPage.tsx` (MV `mv_fluxo_competencia`, RPC `relatorio_fluxo_competencia`) | Regime de competência | P4 |
| Centros de custo | ✅ Ativo | `CentroCustoModal`, `useAuditableCentrosCusto` | Contabilidade gerencial | P2 |
| Plano de contas | ✅ Ativo | `PlanoContas.tsx`, `PlanoContaCombobox` | Hierarquia contábil | P2 |
| Configurações básicas | ✅ Ativo | `ConfigBasicas.tsx` | Naturezas, planos, vencimentos padrão | P2 |
| Relatórios financeiros | ✅ Ativo | `pages/financeiro/Relatorios.tsx` | KPIs financeiros | P4 |
| Materialização de recorrências | ✅ Ativo | Edge `job-recorrencias` + RPC `materializar_recorrencias` | Geração automática de parcelas | P4 |

### 2.3 Gestão Bancária
| Funcionalidade | Status | UX/UI | Impacto | Sprint |
|---|---|---|---|---|
| CRUD Bancos / Agências / Contas Bancárias | ✅ Ativo | `pages/gestao-bancaria/*` | Cadastros base | P1 |
| Movimentações bancárias com validação de saldo | ✅ Ativo | `movimentacoes-bancarias/index.tsx`, trigger `validar_transferencia_movimentacao` | Integridade financeira | P2 |
| Transferência atômica entre contas | ✅ Ativo | RPC `transferencia_bancaria_atomica` | Consistência ACID | P3 |
| Auditoria imutável de movimentações | ✅ Ativo | Trigger `registrar_historico_movimentacao`, RPC `get_audit_trail` | Compliance | P3 |
| Recalculo automático de saldo | ✅ Ativo | Trigger `atualizar_saldo_conta_movimentacao` | Precisão de saldo | P2 |

### 2.4 Cadastros
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Clientes (com política de pagamento, limite crediário) | ✅ Ativo | `Clientes.tsx`, `useClientePolitica`, `CepInput`, `CnpjLookupInput` | P1 |
| Fornecedores | ✅ Ativo | `Fornecedores.tsx` | P1 |
| Serviços | ✅ Ativo | `Servicos.tsx` | P2 |

### 2.5 Estoque
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Produtos, Categorias, Localizações, Un. Medida, Tamanhos | ✅ Ativo | `pages/estoque/*` | P1–P2 |

### 2.6 RH
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Colaboradores, Cargos, Departamentos | ✅ Ativo | `pages/rh/*` | P2 |
| Folha (Vencimentos/Descontos/Benefícios/Integração Ponto) | ✅ Ativo | subrotas `rh/folha/*` | P3 |
| Registros de ponto | ✅ Ativo | `RegistrosPonto.tsx` | P3 |
| Relatórios RH | ✅ Ativo | `pages/rh/Relatorios.tsx` | P4 |

### 2.7 Fiscal
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Notas Fiscais, SPED, Tributos | 🟡 Parcial | `pages/fiscal/*` — CRUD e listagem, sem emissão real | P3 |

### 2.8 Contratos
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Contratos comerciais | ✅ Ativo | `pages/contratos/Contratos.tsx`, `ContratoFormModal` | P3 |

### 2.9 Integração
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Sync Dashboard (webhooks, filas, health) | ✅ Ativo | `SyncDashboard.tsx`, `useSyncHealth`, `useSyncLogs` | P4 |
| Webhooks configuráveis (assinaturas v1/v2, rotação de segredo) | ✅ Ativo | `pages/configuracoes/Webhooks.tsx`, `WebhookConfigModal`, `RotateSecretDialog`, `TestSignatureDialog` | P4 |
| Cutover v1→v2 (dual signing, enforcement) | ✅ Ativo | RPCs `promote_to_dual`, `rollback_to_v1`, `check_v2_readiness` + `scripts/rollout/*` | P4 |

### 2.10 Configurações & Governança
| Funcionalidade | Status | UX/UI | Sprint |
|---|---|---|---|
| Empresas representadas, Usuários, Perfis, Meu Perfil | ✅ Ativo | `pages/configuracoes/*` | P1–P2 |
| Regras de classificação de receita | ✅ Ativo | `RegrasClassificacaoReceita.tsx` (RPC `resolver_classificacao_receita`) | P3 |
| **Relatórios Ops (KPIs, alertas, auditoria, retenção)** | ✅ Ativo | `RelatoriosOps.tsx`, `AlertsDrawer`, `ScheduleList`, workers | **P5–P7** |
| Convite de usuário | ✅ Ativo | Edge `enviar-convite-usuario` | P2 |

### 2.11 Relatórios Ops (destaque P5–P7)
- **P5 — Observabilidade:** KPIs 24h, drawer de alertas, audit trail (RPC `get_audit_trail`).
- **P6 — Governança:** filtros persistidos, re-assinatura de artefatos expirados (`resign-report-run`), export CSV/PDF/XLSX servidor (`_shared/report-export/*`).
- **P7 — Retenção:** poda de artefatos > 30d (`prune-report-artifacts` + cron), badges "Arquivo removido por retenção".
- **P8 — Performance:** baseline, gate anti over-indexing, runbook (`docs/RUNBOOK_P8_PERFORMANCE.md`).

---

## 3. Funcionalidades "Em Breve" / "Em Construção"

| Item | Localização UI | Escopo | Estado |
|---|---|---|---|
| Movimentações de Estoque | `/estoque/movimentacoes` | Entradas/saídas/transferências | Placeholder `<EmBreve>` — sem schema |
| Inventário | `/estoque/inventario` | Contagem e conciliação | Placeholder `<EmBreve>` |
| Relatórios de Estoque | `/estoque/relatorios` | Analíticos de giro/curva ABC | Placeholder `<EmBreve>` |
| Configurações › Sistema | `/configuracoes/sistema` | Preferências globais | `Sistema.tsx` exibe mensagem "em desenvolvimento" |
| Emissão real de NF-e/SPED | `/fiscal/*` | Integração SEFAZ | Cadastros existem; emissão não implementada |
| Conciliação bancária automatizada | Gestão Bancária | Match extrato ↔ movimentações | Roadmap; não iniciado |
| Storybook / PWA / mobile | — | Governança visual e offline | Roadmap conforme knowledge |

---

## 4. Dependências críticas

### 4.1 Internas
- **Vendas → Financeiro:** `gerar_contas_receber_da_venda` cria `contas_receber` a partir de `venda_pagamento_parcelas`.
- **Financeiro → Gestão Bancária:** liquidações movem saldo via `movimentacoes_bancarias` e triggers de saldo.
- **Contratos → Vendas:** contratos geram vendas/orçamentos recorrentes.
- **Relatórios Ops → Todo Storage:** consome `report_schedule_runs.artifact_path`.
- **Configurações › Empresas → Todos os módulos:** RLS por `empresa_representada_id` gate por `user_has_access_to_empresa()`.
- **Regras de classificação → Contas a Receber:** `resolver_classificacao_receita` decide plano/centro em títulos.

### 4.2 Externas
| Serviço | Uso |
|---|---|
| Lovable Cloud (Supabase gerenciado) | Postgres, Auth, Storage, Edge Functions, Realtime |
| Deno Deploy (via Supabase) | Runtime das 11 edge functions |
| BrasilAPI / ViaCEP (via `useCep`, `useCnpjLookup`) | Enriquecimento cadastral |
| `@react-email/components` | Templates transacionais (email de relatório) |
| Provedor de e-mail | `DeliveryProvider` (atualmente `NoopProvider` — DELIVERY_PROVIDER=noop) |
| Pagamento (Stripe/Paddle) | Habilitado como tool, **não integrado** ao módulo Vendas |

---

## 5. Arquitetura e componentes chave

**Frontend:** React 18 · Vite · TS strict · TanStack Query · React Router · React Hook Form + Zod · shadcn/ui · Tailwind tokens semânticos · react-helmet-async · workers dedicados (`relatoriosWorker.ts`).

**Backend Postgres:**
- **74 tabelas** com RLS habilitada + `GRANT`s explícitos por role.
- **Views materializadas:** `mv_fluxo_competencia` (refresh via `refresh_mv_fluxo_competencia`).
- **Triggers:** auditoria (`registrar_historico_movimentacao`), saldo automático, `updated_at`, `protect_perfis_sistema`, `validar_classificacao_categoria`, `validar_transferencia_movimentacao`.
- **RPCs (security definer, search_path fixo):** `has_role`, `user_has_access_to_empresa`, `get_user_empresa_id`, `converter_orcamento_em_venda`, `gerar_contas_receber_da_venda`, `validar_pagamento_venda`, `resolver_classificacao_receita`, `transferencia_bancaria_atomica`, `materializar_recorrencias`, `relatorio_fluxo_competencia`, `get_audit_trail`, `check_v2_readiness`, `promote_to_dual`, `rollback_to_v1`, `precheck_source_system_nome_consistency`.
- **Papéis:** `app_role` enum (`admin`, `moderator`, `user`) em `user_roles` (nunca em `profiles`).

**Edge Functions (Deno):**
| Função | Responsabilidade |
|---|---|
| `run-report-schedules` | Execução agendada, export server-side, retenção |
| `resign-report-run` | Reassinar URL de artefato expirado |
| `prune-report-artifacts` | Poda de artefatos > 30d (P7) |
| `evaluate-ops-alerts` | Gera alertas conforme thresholds |
| `job-recorrencias` | Materializa parcelas recorrentes |
| `data-validator` | Validação de payloads externos |
| `sync-webhook` | Recebe/valida webhooks v1/v2 |
| `retry-failed-syncs` | Reprocessa filas com falha |
| `enviar-convite-usuario` | Onboarding de usuário |
| `health-check` | Health endpoint |

---

## 6. Status operacional e governança (P5–P8)

| Dimensão | Estado | Referência |
|---|---|---|
| **Observabilidade** | KPIs 24h, alertas com dedupe (`idx_report_ops_alerts_open_dedupe`), drawer de reconhecimento | P5, `RelatoriosOps.tsx`, `evaluate-ops-alerts` |
| **Auditoria** | `report_ops_audit` + `historico_movimentacoes_bancarias` (imutáveis) | P5, `get_audit_trail` |
| **Governança de artefatos** | Reassinatura sob demanda, badges de estado (expirado/prunado) | P6, `resign-report-run` |
| **Retenção** | Cron ativo, poda idempotente, runbook publicado | P7, `docs/RUNBOOK_P7_RETENTION.md` |
| **Performance** | Baseline coletado (Snapshots #1–#4), max exec 40 ms, zero Seq Scan > 10k linhas | P8, `docs/P8_BASELINE.md`, `docs/P8_OPTIMIZATION.md` |
| **Manutenção contínua** | Queries de diagnóstico + playbook + checklist | P8.3, `docs/RUNBOOK_P8_PERFORMANCE.md` |
| **Testes** | Vitest 143/143 ✅ · Deno 55/55 alvos ✅ · tsgo strict 0 erros | P8.4 |
| **DB health** | up, memória 61%, disco 15%, 9/60 conexões, 0 restarts | P8.4 |

**Pontos de atenção operacional:**
- `DELIVERY_PROVIDER=noop` — e-mails de relatório **não são enviados** em produção.
- Cache local `deno test` de `_shared/transactional-email-templates` requer `deno install` (pré-existente, não afeta deploy).
- Baseline P8 coletado sob dados de seed `[SEED-P8]`; snapshot #5 sob carga produtiva ainda pendente.

---

## 7. Pontos de atenção e próximos desafios (recomendações)

1. **Ativar entrega real de e-mail** (mudar `DELIVERY_PROVIDER` de `noop` para provedor real) — bloqueio para P5 entregar valor completo ao usuário final.
2. **Emissão fiscal real (NF-e / SPED)** — módulo `Fiscal` hoje é CRUD; integração SEFAZ é o maior gap funcional.
3. **Módulo de Estoque — Movimentações e Inventário** — 3 placeholders `<EmBreve>`; impede fechamento do ciclo comercial→estoque.
4. **Conciliação bancária automatizada** — próxima evolução natural de Gestão Bancária.
5. **Snapshot #5 sob tráfego real** — reabrir P8.2 com dados reais; `ANALYZE public.report_schedule_runs` recomendado imediatamente após.
6. **Reversibilidade do seed** — operador precisa aplicar `supabase/sql/seed_99_down.sql` via migration para retirar dataset `[SEED-P8]` do banco.
7. **Cobertura de teste E2E (Playwright)** — testes atuais são unit/integration; adicionar smoke E2E de fluxo Venda→Título→Liquidação.
8. **Storybook / PWA** — governança visual e experiência mobile permanecem no roadmap.
9. **Painel administrativo de Roles** — hoje a alocação de `user_roles` é manual via SQL; UI dedicada reduziria risco operacional.
10. **Documentação vinculada ao produto** — consolidar `DOCUMENTACAO_COMPLETA_NOVUS_ERP.md`, runbooks P5/P7/P8 em um portal navegável.

---

**Status geral do sistema:** ✅ **Operacional, com governança e performance validadas até P8.** Próximos passos são de **expansão funcional** (Fiscal real, Estoque completo, Conciliação) e **operacionalização de entrega** (DELIVERY_PROVIDER real).
