# AUDITORIA TOMOGRÁFICA — NOVUS ERP MODULAR
**Data:** 2026-07-13 · **Versão:** pós P16.4 · **Escopo:** raio-X celular do sistema (arquivos, camadas, DB, edge functions, APIs, dependências).

---

## 0. Sumário quantitativo

| Métrica | Valor |
|---|---|
| Arquivos TS/TSX em `src/` | **550** |
| Linhas em `src/App.tsx` (roteador central) | 261 |
| Tabelas em `public` | **89** + 4 views (2 mat. `v_report_run_*`, 2 `vw_estoque_*`) |
| Policies RLS ativas | **333** |
| Funções PL/pgSQL em `public` | **51** |
| Triggers ativas | **83** |
| Migrations aplicadas | **97** |
| Edge Functions (Deno) | **13** |
| Rotas React (App.tsx) | ~70 |
| Módulos top-level | 10 |
| Dependências runtime / dev | 52 / 21 |

---

## 1. Camadas (arquitetura em corte transversal)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  UI (React 18 + Vite 5 + TS strict + shadcn/ui + Tailwind tokens)   │
│    src/pages/*              (70 rotas)                              │
│    src/components/*         (11 domínios + ui/ shadcn)              │
└──────────────────────────────────────────────────────────────────────┘
                          │ TanStack Query v5 · React Hook Form + Zod
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  HOOKS  (src/hooks/*)  — 66 arquivos                                │
│    useAuditableEntity, useVendas, useConciliacao, useEstoque, …     │
└──────────────────────────────────────────────────────────────────────┘
                          │ chama serviço tipado
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  SERVICES  (src/services/*) — 51 arquivos                           │
│    CRUD + regras + soft-delete + auditoria + dependenciasService    │
└──────────────────────────────────────────────────────────────────────┘
                          │ supabase-js typed client (Database)
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BACKEND (Supabase gerenciado — Lovable Cloud)                      │
│    Postgres 15 · RLS · Triggers · 51 RPCs · MVs                     │
│    Auth (JWT)  ·  Storage  ·  Realtime                              │
│    13 Edge Functions Deno                                           │
└──────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
       APIs externas: BrasilAPI / ViaCEP · @react-email · Provider e-mail (Noop atual)
```

---

## 2. Árvore de arquivos do frontend (`src/`)

```text
src/
├── App.tsx / main.tsx / App.css / index.css
├── contexts/AuthContext.tsx
├── integrations/supabase/
│   ├── client.ts            [autogen — não editar]
│   └── types.ts             [autogen — 89 tabelas tipadas]
├── lib/
│   ├── bankingErrors.ts     · featureFlags.ts · queryKeys.ts
│   ├── statusMappers.ts     · utils.ts (cn helper)
├── data/                    (constantes: estados, formas atuação, etc.)
├── types/                   (28 arquivos — contratos TS por domínio)
│   agencia · banco · cliente · clientePolitica · conciliacao
│   configBasicas · configuracoes · contaBancaria · contasPagar
│   contasReceber · contratos · contato · dependencias · empresa
│   estoque · fiscal · fluxoCaixa · fornecedor · movimentacoesBancarias
│   movimentacoesFinanceiras · pagamento · planoContas · produto
│   reportSchedule · rh · setor · socios · vendaPagamento · vendas
│   webhookConfig · classificacaoReceita
├── hooks/                   (66 arquivos + subpastas)
│   conciliacao/useConciliacao.ts
│   estoque/{useEmpresaAtual, useEstoque, useKardex, useRelatoriosEstoque}
│   +64 hooks de domínio (ver §5)
├── services/                (51 arquivos + subpastas)
│   contasPagar/ · contasReceber/ · classificacaoReceita/
│   conciliacao/ · estoque/ · fiscal/
├── utils/                   (regras puras: parcelamento, csvExport,
│   currencyUtils, relatoriosAgg, reportInsights, reportBranding,
│   reportExportPdf/Excel/Shared, orcamentoPdf, authUtils, produtoUtils)
├── workers/                 (relatoriosWorker.ts + core testado)
├── docs/examples/           (templates: new-auditable-entity)
├── __tests__/               (Vitest — fluxos críticos, parcelamento,
│                             classificação, gerar contas, lote3d,
│                             webhookConfigService)
├── test/setup.ts
├── assets/                  (login-hero.png.asset.json)
├── pages/                   (70 rotas — ver §3)
└── components/              (11 domínios + ui/ shadcn — ver §4)
```

---

## 3. Rotas / Páginas (mapa completo)

Roteador único em `src/App.tsx`, protegido por `<ProtectedRoute>` (JWT) e, para admin, `<AdminRoute>`.

| Módulo | Rota | Página |
|---|---|---|
| — | `/login` | `Login.tsx` |
| — | `/` (index) | `Dashboard.tsx` |
| Cadastros | `/cadastros/clientes` `.../fornecedores` `.../servicos` | 3 páginas |
| Estoque | `/estoque/{produtos,categorias,localizacoes,unidades-medida,tamanhos,movimentacoes,inventario,kardex/:produtoId,relatorios,relatorios/{giro,curva-abc,posicao,parados,ruptura}}` | 13 páginas |
| Vendas | `/vendas/{pedidos,orcamentos,contratos,relatorios}` (+ redirect `/contratos/*`) | 4 páginas |
| Gestão Bancária | `/gestao-bancaria/{bancos,agencias,contas-bancarias,movimentacoes-bancarias, conciliacao,conciliacao/importar,conciliacao/regras,conciliacao/relatorios,conciliacao/:extratoId}` | 9 páginas |
| Financeiro | `/financeiro/{contas-receber,contas-pagar,movimentacoes,fluxo-caixa,fluxo-competencia,centros-custo,plano-contas,config-basicas,relatorios}` | 9 páginas |
| Fiscal | `/fiscal/{notas-fiscais,sped,tributos}` | 3 páginas (CRUD, sem emissão real) |
| RH | `/rh/{colaboradores,cargos,departamentos,folha/{folha-pagamento,vencimentos-padrao,descontos-padrao,beneficios-vinculados,integracao-ponto},registros-ponto,relatorios}` | 10 páginas |
| Integração | `/integracao/sincronizacao` | `SyncDashboard.tsx` |
| Configurações | `/configuracoes/{empresas,usuarios,sistema,perfil,webhooks,relatorios-ops}` | 6 páginas |
| Fallback | `*` | 404 inline |

---

## 4. Componentes (por domínio)

```text
src/components/
├── auth/                (ProtectedRoute, AdminRoute + tests)
├── configuracoes/       (CentroCustoModal, RegraClassificacaoModal,
│                         RotateSecretDialog, TestSignatureDialog,
│                         WebhookConfigModal, CentroCustoCard/EmptyState)
├── contratos/           (ContratoFormModal)
├── financeiro/          {bancos, config-basicas, contas-pagar,
│                         contas-receber, fluxo-caixa, movimentacoes}
├── gestao-bancaria/     {agencias, bancos, contas-bancarias,
│                         movimentacoes-bancarias}
├── layout/              (AppHeader, AppLayout, AppSidebar, BrandFooter,
│                         header/UserDropdown, sidebar/* + tests)
├── modules/             (Cargos, DescontosPadrao, FormCargo/Depto/Desconto/Vencimento,
│                        VencimentosPadrao, clientes, configuracoes/{empresas,usuarios},
│                        fiscal, rh)
├── relatorios/          (AggregatedTable, ComparisonToggle, DeltaBadge,
│                         DrillFilterBadge, ExportMenu, GroupBySelect,
│                         InsightsBanner, PerfOverlay, PresetsMenu,
│                         ScheduleList, ScheduleModal, __tests__,
│                         ops/{AlertsDrawer, KpiCards, OpsFilters,
│                              RunsFailuresTable})
├── shared/              (CepInput, CnpjLookupInput, ConfirmDeleteWithDeps,
│                         CpfInput, PlanoContaCombobox)
├── vendas/              (CatalogoItemPicker, ConverterVendaDialog,
│                         GerarTitulosButton, OrcamentoAcoesMenu,
│                         OrcamentoViewDialog, VendaFormModal,
│                         VendaPagamentoSection)
└── ui/                  (shadcn: ~45 primitives + sidebar/ + tests)
```

---

## 5. Hooks (66) — agrupamento funcional

| Grupo | Hooks |
|---|---|
| Cadastro / Domínio | useClientes, useClientePolitica, useFornecedores, useEmpresasRepresentadas, useEmpresaResponsavel, useEmpresaLogoUrl, useEmpresasLogosMap, useSociosRepresentantes, useSetores |
| Estoque | useProdutos, useCategorias, useLocalizacoes, useTamanhos, useUnidadesMedida, estoque/{useEstoque, useKardex, useRelatoriosEstoque, useEmpresaAtual} |
| Vendas / Orçamento | useVendas, useOrcamentos, useCatalogoOrcamento, usePagamentoCatalogo, useVendaPagamento, useGerarContasReceber |
| Contratos | useContratos |
| Gestão Bancária | useBancos, useAgencias, useContasBancarias, useMovimentacoesBancarias, useMovimentacoesCompletas |
| Conciliação | conciliacao/useConciliacao |
| Financeiro | useContasPagar, useContasPagarForm, useContasReceber, useMovimentacoesFinanceiras, useFluxoCaixa, useFluxoCaixaExport, usePlanoContas, useCentrosCusto, useAuditableCentrosCusto, useConfigBasicas, useContaContabilSearch, useRegrasClassificacao, useVencimentosPadrao, useDescontosPadrao |
| Fiscal | useFiscal |
| RH | useColaboradores, useColaboradorFormValidation, useCargos, useDepartamentos |
| Ops / Relatórios | useOpsAlerts, useOpsFilters, useReportPresets, useReportRunKpis, useReportSchedules, useReportWorker, useSyncHealth, useSyncLogs, useSyncStatus |
| Integrações externas | useCep, useCnpjLookup |
| Auth / Governança | useAuthenticationState, useMeuPerfil, useUsuarios, useUsuarioErrorHandler, usePerfis, useEmpresaLogoUrl |
| Genéricos | useAuditableEntity, useCheckDependencias, use-mobile, use-toast |

---

## 6. Services (51) — mapa 1:1 com backend

`agenciaService` · `auditableCentroCustoService` · `bancoService` · `cargoService` · `categoriaService` · `centroCustoService` · `classificacaoReceita/` · `clientePoliticaService` · `clienteService` · `cnpjApi` · `colaboradorService` · `conciliacao/` · `configBasicasService` · `contaBancariaService` · `contasPagar/` + `contasPagarService` · `contasReceber/` + `contasReceberService` · `contratosService` · `departamentoService` · **`dependenciasService`** · `descontoPadraoService` · `empresaResponsavelService` · `empresasRepresentadasService` · `estoque/` · `fiscal/` + `fiscalService` · `fluxoCaixaService` · `fornecedorService` · `localizacaoService` · `movimentacoesBancariasService` · `movimentacoesService` · `opsAlertsService` · `opsAuditService` · `orcamentosService` · `pagamentoCatalogoService` · `planoContasService` · `produtoService` · `reportRunOpsService` · `reportSchedulesService` · `setorService` · `sociosRepresentantesService` · `syncService` · `tamanhoService` · `unidadeMedidaService` · `usuarioService` · `vencimentoPadraoService` · `vendaPagamentoService` · `vendasService` · `webhookConfigService`.

---

## 7. Banco de dados — tabelas (89)

### 7.1 Domínio comercial (Vendas)
`vendas`, `itens_venda`, `venda_pagamento`, `venda_pagamento_parcelas`, `venda_parcela_classificacao_receita`, `orcamentos_venda`, `orcamentos_venda_itens`, `contratos`.

### 7.2 Cadastros
`clientes`, `cliente_politica_pagamento`, `cliente_modalidades_bloqueadas`, `fornecedores`, `servicos`, `empresas_representadas`, `empresa_responsavel`, `socios_representantes`, `setores_empresa`.

### 7.3 Estoque
`produtos`, `categorias_produtos`, `localizacoes_estoque`, `unidades_medida`, `tamanhos_produtos`, `estoque_movimentacoes`, `estoque_saldos`, `estoque_inventarios`, `estoque_inventario_itens`, `lotes_movimentacoes`, `produto_fornecedores`, `historico_estoque_movimentacoes`, views `vw_estoque_posicao_localizacao`, `vw_estoque_ruptura`.

### 7.4 Financeiro
`contas_pagar`, `contas_receber`, `rateios_contas_pagar`, `rateios_contas_receber`, `liquidacoes_titulos`, `liquidacoes_multiplas`, `documentos_titulos_financeiros`, `plano_contas`, `centros_custo`, `naturezas_pagamento`, `naturezas_receita`, `vencimentos_padrao`, `descontos_padrao`, `regras_classificacao_receita`, `natureza_operacao`, `natureza_caixas`, `modalidade_caixas`, `modalidades_pagamento`, `modalidade_api_vinculo`, `planos_pagamento`, `historico_movimentacoes_financeiras`.

### 7.5 Gestão Bancária / Conciliação
`bancos`, `agencias_bancarias`, `contas_bancarias`, `movimentacoes_bancarias`, `documentos_movimentacoes_bancarias`, `historico_movimentacoes_bancarias`, `banco_extratos_importados`, `banco_movimentacoes_extrato`, `banco_regras_conciliacao`, `banco_conciliacao_log`.

### 7.6 RH
`colaboradores`, `cargos`, `departamentos`, `folha_pagamento`, `beneficios_vinculados`, `registros_ponto`, `integracoes_ponto`.

### 7.7 Fiscal
`fiscal_configuracoes`, `fiscal_documentos_eletronicos`, `fiscal_documentos_eletronicos_itens`, `fiscal_eventos`, `fiscal_sped_arquivos`, `configuracoes_fiscais`, `tributos`, `cfop`, `ncm`.

### 7.8 Governança / Segurança
`user_roles` (enum `app_role`), `usuarios`, `perfis`, `perfis_acesso`, `entidade_dependencias`.

### 7.9 Ops / Relatórios / Integração
`report_schedules`, `report_schedule_runs`, `report_ops_alerts`, `report_ops_audit`, views `v_report_run_kpis_24h`, `v_report_run_failures_by_reason_24h`, `webhook_configs`, `webhook_deliveries`, `sync_logs`, `sync_queue`.

**Segurança:** 333 policies RLS; 100% das tabelas públicas com RLS habilitada + `GRANT` explícito. Roles em `user_roles` isolada — nunca em `profiles` (obedece §user-roles).

---

## 8. Funções PL/pgSQL (51) — por finalidade

| Categoria | Funções |
|---|---|
| Governança / Acesso | `has_role`, `user_has_access_to_empresa`, `get_user_empresa_id`, `protect_perfis_sistema` |
| Vendas → Financeiro | `converter_orcamento_em_venda`, `gerar_contas_receber_da_venda`, `validar_pagamento_venda`, `snapshot_classificacao_venda`, `bloquear_edicao_orcamento_convertido`, `resolver_classificacao_receita`, `validar_classificacao_categoria` |
| Estoque | `baixar_estoque_venda`, `estornar_estoque_venda`, `validar_saldo_estoque`, `recalc_saldo_estoque`, `trg_estoque_mov_recalc`, `trg_estoque_mov_validar_saldo`, `registrar_historico_estoque`, `fn_kardex_produto`, `fn_curva_abc`, `fn_refresh_mv_curva_abc`, `fn_relatorio_giro`, `fn_produtos_parados`, `conciliar_inventario` |
| Bancário | `atualizar_saldo_conta_movimentacao`, `validar_transferencia_movimentacao`, `registrar_historico_movimentacao`, `transferencia_bancaria_atomica`, `criar_lancamento_do_extrato` (×2 overloads), `confirmar_match`, `desfazer_conciliacao`, `sugerir_matches_extrato`, `reverter_extrato`, `trg_extrato_marcar_conciliado` |
| Financeiro / MVs | `materializar_recorrencias`, `relatorio_fluxo_competencia`, `refresh_mv_fluxo_competencia`, `periodicidade_meses` |
| Ops / Auditoria | `get_audit_trail`, `check_dependencias`, `regenerar_entidade_dependencias` |
| Utilitárias | `update_updated_at_column` |
| Rollout webhook v1→v2 | `check_v2_readiness`, `promote_to_dual`, `promote_to_v2_only`, `rollback_to_dual`, `rollback_to_v1`, `precheck_source_system_nome_consistency` |

**Triggers:** 83 no total — cobrem `updated_at`, auditoria de estoque/bancário, saldo automático, validação transferência, proteção de perfis sistema, snapshot de classificação em vendas, conciliação de extrato, bloqueio de orçamento convertido.

---

## 9. Edge Functions (13, Deno)

| Função | Papel | Notas |
|---|---|---|
| `run-report-schedules` | Execução agendada + export server (CSV/PDF/XLSX) + retenção | consome `_shared/report-export/*` |
| `resign-report-run` | Reassina URL expirada de artefato | inclui audit |
| `prune-report-artifacts` | Poda > 30d + cron | idempotente |
| `evaluate-ops-alerts` | Avalia thresholds → cria alertas | dedupe via `idx_report_ops_alerts_open_dedupe` |
| `job-recorrencias` | Materializa parcelas recorrentes | `verify_jwt=false` (job) |
| `data-validator` | Valida payloads externos | usado por webhooks |
| `sync-webhook` | Ingestão webhook v1/v2 | assinatura dual |
| `retry-failed-syncs` | Reprocessa filas com falha | idempotência |
| `enviar-convite-usuario` | Onboarding | usa `_shared/transactional-email-templates` |
| `banco-parse-extrato` | Parse OFX/CSV → linhas extrato | Bankfeed conciliação |
| `health-check` | Endpoint saúde | |
| `e2e-reset` | Reset de tenant E2E | Playwright |
| `e2e-set-venda-status` | Set status forçado | Playwright |

**`_shared/`:** `delivery/{DeliveryProvider, EmailProvider, NoopProvider, resolveProvider}` (atualmente `DELIVERY_PROVIDER=noop`), `report-export/{branding, errorCodes, exportCsvServer, exportPdfServer, exportXlsxServer, limits, retention, validateViewState}`, `transactional-email-templates/{registry, report-scheduled-delivery}`.

---

## 10. APIs externas

| Provedor | Uso | Camada |
|---|---|---|
| Lovable Cloud (Supabase gerenciado) | Postgres, Auth, Storage, Edge, Realtime | Backend |
| BrasilAPI | Lookup CNPJ (`useCnpjLookup`, `services/cnpjApi`) | Frontend → HTTPS |
| ViaCEP | Lookup CEP (`useCep`) | Frontend → HTTPS |
| `@react-email/components` | Templates transacionais | Edge Function |
| DeliveryProvider real | (não configurado — `noop` em prod) | Edge Function |
| Stripe / Paddle | Tool habilitada — **não integrada** | — |

---

## 11. Dependências (runtime `52` / dev `21`)

### 11.1 Runtime críticas
- **React stack:** `react 18.3.1`, `react-dom 18.3.1`, `react-router-dom 6.26.2`, `react-hook-form 7.53`, `@hookform/resolvers 3.9`, `zod 3.23.8`.
- **Data / Cache:** `@tanstack/react-query 5.56`, `@supabase/supabase-js 2.110`.
- **UI:** 28 pacotes `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `lucide-react`, `sonner`, `next-themes`, `cmdk`, `vaul`, `input-otp`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`.
- **Dados:** `date-fns 3.6`, `recharts 2.12`, `xlsx 0.18`, `exceljs 4.4`, `jspdf 4.2` + `jspdf-autotable 5.0`.

### 11.2 Dev / Test
- `vite 5.4`, `@vitejs/plugin-react-swc 3.5`, `typescript 5.5`, `vitest 4.1`, `jsdom 29`, `@testing-library/{react,jest-dom,user-event}`, `@playwright/test 1.61`, `@axe-core/playwright 4.12`, `eslint 9` + `typescript-eslint 8`, `tailwindcss 3.4`, `@tailwindcss/typography 0.5`, `lovable-tagger 1.1`.

---

## 12. Dependências internas críticas (fluxos transversais)

```text
Orçamento ──converter_orcamento_em_venda──▶ Venda
Venda ─────gerar_contas_receber_da_venda──▶ Contas a Receber
Venda ─────baixar_estoque_venda (trigger)─▶ Estoque (mov + saldo)
Venda ─────snapshot_classificacao_venda──▶ venda_parcela_classificacao_receita
Contas Receber ──resolver_classificacao_receita──▶ Plano/Centro
Liquidação  ──atualizar_saldo_conta_movimentacao──▶ Movimentações Bancárias
Extrato ────sugerir_matches_extrato/confirmar_match──▶ Movimentações Bancárias
Recorrência ──materializar_recorrencias (edge)──▶ Contas Pagar/Receber
Relatórios Ops ──report_schedule_runs.artifact_path──▶ Storage (retenção 30d)
Todas tabelas multi-tenant ──user_has_access_to_empresa()──▶ RLS
```

---

## 13. Configurações / migrations

- **`supabase/migrations/`**: 97 arquivos (histórico versionado).
- **`supabase/sql/`**: `p5_health_probes`, `p5_ops_queries`, `p7_prune_cron`, `p7_retention_queries`, `p8_baseline_queries`, `p8_maintenance_queries`, `rollout_v2_dashboards`, `rollout_v2_tenant_ops`, `seed_99_down`.
- **`supabase/config.toml`**: apenas `job-recorrencias` com `verify_jwt=false`.
- **`e2e/`**: fixtures (`auth`, `db-read`, `db-reset`, `set-venda-status`, `test-data`), POMs (10 arquivos), specs 01–05 (login → venda→liquidação → conciliação → produto/estoque → regras conciliação), `playwright.config.ts` com `workers:1` + timeouts CI, `README.md` §5 CI.
- **`evidence/`**: artefatos rollout v1→v2, snapshots P8, healthchecks.
- **`docs/`**: `DOCUMENTACAO_COMPLETA_NOVUS_ERP.md`, `ESTOQUE_AUDIT.md`, `P12_ESTOQUE.md`, `P8_BASELINE.md`, `P8_OPTIMIZATION.md`, `P8_SPRINT_CLOSEOUT.md`, `RUNBOOK_P5/P7/P8`, **este arquivo**, `SYSTEM_AUDIT.md`.

---

## 14. Testes

| Camada | Framework | Cobertura |
|---|---|---|
| Unit / integração TS | Vitest 143/143 ✅ | classificação, gerar contas receber, parcelamento, lote3D, fluxos críticos, webhookConfigService, componentes `relatorios`, `AdminRoute`, workers |
| Deno tests | 55/55 ✅ | edge functions (thresholds, prune, resign, run-report, limits, branding-email) |
| E2E | Playwright 1.61 | F1 login · F2 venda→liquidação · F3 conciliação · F4 produto/estoque · F5 regras conciliação |
| Typecheck | tsgo strict | 0 erros |

---

## 15. Estado operacional (P5–P8 fechados + P16 E2E)

| Dimensão | Status |
|---|---|
| Observabilidade (KPIs 24h, alertas, drawer) | ✅ P5 |
| Auditoria imutável (`report_ops_audit`, hist. bancária) | ✅ P5 |
| Governança artefatos (reassinatura, badges) | ✅ P6 |
| Retenção 30d + cron | ✅ P7 |
| Performance (baseline, gate over-indexing, runbook) | ✅ P8 (max exec 40 ms · zero Seq Scan > 10k) |
| Suíte E2E consolidada (5 fluxos, CI-ready) | ✅ P16.4 |
| DB health | up · mem 61% · disco 15% · 9/60 conexões · 0 restarts |

---

## 16. Riscos remanescentes / hotspots

1. **DELIVERY_PROVIDER=noop** — e-mails de relatório não são entregues em produção.
2. **Fiscal** = CRUD; **sem emissão real NF-e/SPED** (integração SEFAZ pendente).
3. **Estoque — Movimentações/Inventário/Relatórios**: implementados desde P12, mas placeholders originais `<EmBreve>` ainda presentes em `pages/estoque/EmBreve.tsx` (revisar deprecation).
4. **Conciliação bancária automatizada** — motor de sugestões existe (`sugerir_matches_extrato`), mas confirmação continua manual.
5. **`user_roles`** sem UI dedicada — atribuição via SQL (risco operacional).
6. **Playwright** não executável no sandbox — depende de `E2E_PASS` + Vite + browsers em CI.
7. **Painéis de rollout webhook v2** dependem de execução manual de `scripts/rollout/v2-cutover.mjs`.
8. **Snapshot #5 produtivo** ainda pendente (baseline P8 foi sobre seed).

---

## 17. Legenda de saúde por módulo

| Módulo | Cobertura funcional | Testes | Governança | Nota |
|---|---|---|---|---|
| Vendas / Orçamento | 🟢 completo | 🟢 unit+E2E | 🟢 audit+RLS | 5/5 |
| Financeiro | 🟢 completo | 🟢 unit+E2E | 🟢 audit+RLS | 5/5 |
| Gestão Bancária | 🟢 CRUD+conciliação | 🟢 unit+E2E | 🟢 audit+RLS | 5/5 |
| Estoque | 🟢 CRUD+mov+kardex+relatórios | 🟢 unit+E2E | 🟢 audit+RLS | 5/5 |
| Cadastros | 🟢 completo | 🟡 unit | 🟢 RLS | 4/5 |
| RH | 🟡 CRUD+folha | 🔴 sem E2E | 🟢 RLS | 3/5 |
| Fiscal | 🔴 sem emissão | 🔴 sem E2E | 🟢 RLS | 2/5 |
| Contratos | 🟢 CRUD | 🟡 unit | 🟢 RLS | 4/5 |
| Integração / Sync | 🟢 dashboard+webhooks | 🟢 deno tests | 🟢 audit | 5/5 |
| Configurações / Ops | 🟢 completo (P5–P8) | 🟢 unit+deno | 🟢 audit+retenção | 5/5 |

---

**Conclusão:** o sistema está estruturalmente saudável — 89 tabelas com RLS+GRANT, 333 policies, 51 RPCs, 83 triggers e 13 edge functions cobrindo os fluxos críticos, respaldados por 550 arquivos TS/TSX organizados em 4 camadas limpas (UI → Hooks → Services → DB). Os hotspots são **produto** (fiscal real, conciliação automática, UI de roles) e **operação** (delivery de e-mail real, execução de rollout webhook v2 em produção), não estrutura.
