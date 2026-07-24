# CONSOLIDAÇÃO NOVUS ERP MODULAR

**Data da Consolidação:** 18 de Julho de 2026
**Versão:** 1.0
**Escopo:** Este documento serve como um guia consolidado para novas equipes e membros, oferecendo uma visão geral da arquitetura, módulos, tecnologias, estado operacional e próximos passos do sistema NOVUS ERP. Ele integra informações dos diversos documentos de auditoria, runbooks e diagnósticos fornecidos.

---

## 1. Visão Geral e Arquitetura do Sistema

O NOVUS ERP é um sistema modular construído com uma arquitetura moderna e escalável, utilizando o Supabase como backend gerenciado e React no frontend.

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

**Principais Características:**
*   **Frontend:** React 18, Vite 5, TypeScript (strict), Shadcn/UI, Tailwind CSS.
*   **Backend:** Supabase (PostgreSQL 15, RLS, Triggers, RPCs, Materialized Views), Supabase Auth, Storage, Realtime.
*   **Edge Functions:** 13 funções Deno para lógica de negócio serverless (ex: relatórios, retenção, sincronização).
*   **Gerenciamento de Estado:** TanStack Query v5 para dados assíncronos.
*   **Formulários:** React Hook Form com validação Zod.
*   **Segurança:** Row Level Security (RLS) em todas as tabelas, JWT para autenticação.

---

## 2. Módulos Principais e Rotas

O sistema é composto por diversos módulos, cada um com suas rotas e funcionalidades específicas.

| Módulo | Rotas Principais | Observações |
|---|---|---|
| **Cadastros** | `/cadastros/clientes`, `/cadastros/fornecedores`, `/cadastros/servicos` | Gerenciamento de entidades básicas. |
| **Estoque** | `/estoque/{produtos, movimentacoes, inventario, kardex, relatorios}` | Controle completo de estoque, movimentações e inventário. |
| **Vendas** | `/vendas/{pedidos, orcamentos, contratos, relatorios}` | Gestão de todo o ciclo de vendas. |
| **Gestão Bancária** | `/gestao-bancaria/{contas-bancarias, movimentacoes, conciliacao}` | Controle de contas, extratos e conciliação bancária. |
| **Financeiro** | `/financeiro/{contas-receber, contas-pagar, fluxo-caixa, plano-contas}` | Gestão de contas a pagar/receber, fluxo de caixa e plano de contas. |
| **Fiscal** | `/fiscal/{notas-fiscais, sped, tributos}` | Módulo fiscal (CRUD, **sem emissão real NF-e/SPED**). |
| **RH** | `/rh/{colaboradores, cargos, departamentos, folha}` | Gestão de recursos humanos e folha de pagamento. |
| **Integração** | `/integracao/sincronizacao` | Dashboard e configurações de sincronização com sistemas externos. |
| **Configurações** | `/configuracoes/{empresas, usuarios, sistema, webhooks, relatorios-ops}` | Configurações gerais do sistema e operacionais. |
| **Dashboard** | `/` (index), `/fiscal/dashboard` | Visão geral e KPIs. |
| **Autenticação** | `/login` | Login de usuários. |

---

## 3. Banco de Dados (PostgreSQL no Supabase)

*   **Tabelas:** 89 tabelas em `public`, além de 4 views (2 materializadas).
*   **RLS:** 333 políticas de RLS ativas, garantindo segurança multi-tenant.
*   **Funções PL/pgSQL:** 51 funções para lógica de negócio complexa e otimização.
*   **Triggers:** 83 triggers para automação (ex: `updated_at`, auditoria, saldo automático).
*   **Migrations:** 97 migrations aplicadas, com histórico versionado em `supabase/migrations/`.

**Exemplos de Tabelas Críticas:**
*   `vendas`, `itens_venda`, `contratos`
*   `clientes`, `fornecedores`, `empresas_representadas`
*   `produtos`, `estoque_movimentacoes`, `estoque_saldos`, `estoque_inventarios`
*   `contas_pagar`, `contas_receber`, `plano_contas`, `centros_custo`
*   `contas_bancarias`, `movimentacoes_bancarias`, `banco_extratos_importados`
*   `fiscal_documentos_eletronicos`, `fiscal_eventos`
*   `report_schedules`, `report_schedule_runs`, `report_ops_alerts`

---

## 4. Edge Functions (Deno)

13 Edge Functions implementam lógica serverless, otimizando performance e isolando responsabilidades.

*   `run-report-schedules`: Execução agendada e exportação de relatórios (CSV/PDF/XLSX).
*   `resign-report-run`: Reassina URLs expiradas de artefatos de relatório.
*   `prune-report-artifacts`: Poda artefatos de relatório com mais de 30 dias.
*   `evaluate-ops-alerts`: Avalia thresholds e cria alertas operacionais.
*   `job-recorrencias`: Materializa parcelas recorrentes.
*   `sync-webhook`: Ingestão de webhooks de sistemas externos.
*   `fiscal-emitir-nfe`, `fiscal-cancelar-nfe`, `fiscal-cce-nfe`: Funções mock para emissão/cancelamento/CC-e de NF-e.
*   `banco-parse-extrato`: Processa arquivos OFX/CSV para conciliação bancária.
*   `health-check`, `e2e-reset`, `e2e-set-venda-status`: Funções utilitárias e para testes E2E.

---

## 5. Fluxos de Dados e Integrações

O sistema possui fluxos de dados bem definidos e integrações com APIs externas.

**Fluxos Internos Críticos:**
*   **Orçamento → Venda:** `converter_orcamento_em_venda`.
*   **Venda → Contas a Receber:** `gerar_contas_receber_da_venda`.
*   **Venda → Estoque:** `baixar_estoque_venda` (via trigger).
*   **Liquidação → Movimentações Bancárias:** `atualizar_saldo_conta_movimentacao`.
*   **Extrato Bancário → Conciliação:** `sugerir_matches_extrato`, `confirmar_match`.
*   **Recorrências:** `materializar_recorrencias` (Edge Function).
*   **Relatórios Ops:** `report_schedule_runs.artifact_path` para Storage com retenção de 30 dias.
*   **Multi-tenant:** `user_has_access_to_empresa()` para RLS em todas as tabelas.

**APIs Externas:**
*   **BrasilAPI:** Lookup CNPJ (`useCnpjLookup`).
*   **ViaCEP:** Lookup CEP (`useCep`).
*   **@react-email/components:** Templates para e-mails transacionais.
*   **DeliveryProvider real:** (Atualmente `noop` em produção, sem envio real de e-mails).

---

## 6. Qualidade de Código e Testes

O projeto adota práticas rigorosas de qualidade e possui uma suíte de testes abrangente.

*   **Typecheck:** `bunx tsgo --noEmit` com 0 erros.
*   **Testes Unitários/Integração (Vitest):** 143/143 testes passando, cobrindo fluxos críticos, classificação, parcelamento, componentes de relatórios, etc.
*   **Testes Deno:** 55/55 testes passando para Edge Functions (retenção, resign, run-report, etc.).
*   **Testes E2E (Playwright):** 5 fluxos críticos (login, venda→liquidação, conciliação, produto/estoque, regras de conciliação) consolidados e prontos para CI.

---

## 7. Estado Operacional e Performance

O sistema está estruturalmente saudável e com boa performance.

*   **Observabilidade:** KPIs 24h, alertas e drawer de alertas operacionais implementados (P5).
*   **Auditoria:** Auditoria imutável (`report_ops_audit`, histórico bancário e de estoque) implementada (P5).
*   **Governança de Artefatos:** Reassinatura de URLs e badges de status implementados (P6).
*   **Retenção:** Política de retenção de 30 dias para artefatos de relatório com cron (P7).
*   **Performance:**
    *   Baseline estabelecido (P8).
    *   Gate anti over-indexing aplicado (P8.2).
    *   Runbook de performance (`RUNBOOK_P8_PERFORMANCE.md`) disponível.
    *   Máximo tempo de execução de query crítica: 40 ms.
    *   Zero `Seq Scan` em tabelas > 10k linhas.
*   **DB Health:** Instância Supabase saudável (memória 61%, disco 15%, 9/60 conexões, 0 restarts).

---

## 8. Riscos Remanescentes e Próximos Passos

Apesar da robustez, existem áreas que requerem atenção ou desenvolvimento futuro.

### Riscos Remanescentes:
1.  **DELIVERY_PROVIDER=noop:** E-mails de relatório não são entregues em produção.
2.  **Módulo Fiscal:** Atualmente apenas CRUD; **sem emissão real de NF-e/SPED** (integração SEFAZ pendente).
3.  **Conciliação Bancária Automatizada:** Motor de sugestões existe, mas a confirmação ainda é manual.
4.  **`user_roles`:** Sem UI dedicada; atribuição via SQL (risco operacional).
5.  **Playwright:** Não executável no sandbox; depende de ambiente CI.
6.  **Snapshot #5 produtivo:** Baseline de performance P8 foi sobre seed; snapshot com tráfego real ainda pendente.
7.  **UI Fiscal:** As abas "Emitir", "Consultar" e "Relatórios" em `/fiscal/notas-fiscais` e as abas em `/fiscal/sped` ainda são placeholders ("Funcionalidade em desenvolvimento"). O `DashboardFiscal` existe, mas está em uma rota separada (`/fiscal/dashboard`) e protegida por `AdminRoute`.
8.  **Alertas Fiscais:** As 4 regras existem no código, mas o cron do `evaluate-ops-alerts` não está agendado, ou seja, não são disparadas automaticamente.
9.  **Banco de Dados Fiscal:** Zero documentos e eventos fiscais registrados, indicando que o fluxo mock nunca foi exercitado contra o banco real.

### Próximos Passos (Foco em UI Visível e Funcionalidade Fiscal):
1.  **Substituir Stubs da UI Fiscal (`/fiscal/notas-fiscais`):**
    *   Aba Dashboard: Consumir `fiscal_metrics_daily` e listar últimas notas.
    *   Aba Emitir: Listar vendas faturadas sem NF-e e integrar `EmitirNFeDialog`.
    *   Aba Consultar: Grid com filtros sobre `fiscal_documentos_eletronicos` e `DetalheNFeDrawer`.
    *   Aba Relatórios: Manter placeholder ou remover.
2.  **Consolidar o Dashboard Fiscal:** Mover o conteúdo do `DashboardFiscal` para a aba "Dashboard" de `/fiscal/notas-fiscais` e remover a rota `/fiscal/dashboard`.
3.  **Popular o Banco com Dados Fiscais (Smoke Automatizado):** Criar uma Edge Function agendada (`fiscal-mock-populator`) para chamar `fiscal-smoke-run` e popular os KPIs.
4.  **Agendar `evaluate-ops-alerts`:** Criar migration para agendar o cron da Edge Function `evaluate-ops-alerts` para que as regras fiscais sejam avaliadas automaticamente.
5.  **Reescrever `SPED.tsx`:** Marcar honestamente como "aguardando provedor" em vez de "em desenvolvimento".
6.  **Verificação Visual:** Capturar screenshots da UI Fiscal antes e depois das mudanças para validação.

---

## 9. Referências da Documentação Original

*   `AUDITORIA_TOMOGRAFICA_NOVUS_ERP.md`: Raio-X completo do sistema.
*   `RUNBOOK_P8_PERFORMANCE.md`: Operação contínua do banco Postgres/Supabase.
*   `RUNBOOK_P7_RETENTION.md`: Retenção de artefatos de relatórios.
*   `RUNBOOK_P5.md`: Pipeline de agendamento de relatórios.
*   `P8_SPRINT_CLOSEOUT.md`: Validação final dos critérios de performance.
*   `P8_OPTIMIZATION.md`: Otimização orientada a evidência (indexação).
*   `P8_BASELINE.md`: Baseline de performance (snapshot inicial).
*   `P12_ESTOQUE.md`: Implementação completa do Módulo de Estoque.
*   `DIAGNOSTICO_FISCAL_REAL.md`: Diagnóstico inicial do Módulo Fiscal.
*   `DIAGNOSTICO_FISCAL_CORRIGIDO.md`: Diagnóstico corrigido do Módulo Fiscal com foco na UI.
*   `DOCUMENTACAO_COMPLETA_NOVUS_ERP.md`: Documentação detalhada de tabelas, serviços, componentes, hooks e tipos.

---