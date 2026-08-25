# ESTOQUE_AUDIT.md — Auditoria do Módulo de Estoque

**Data:** 13/07/2026  
**Sprint de referência:** P12 (implementação) + P13.1 (integrações fiscais em progresso)  
**Status geral:** ✅ Operacional — funcionalidades core entregues; relatórios e extensões pendentes.

---

## 1. Visão Geral

O Módulo de Estoque do NOVUS ERP é responsável pelo controle de **movimentação física de produtos** (entradas, saídas, transferências) e pela **conciliação periódica de saldos** via inventário. Ele substitui os placeholders `<EmBreve>` que existiam antes de P12 e passa a ser o ponto único de verdade dos saldos por produto/localização.

**Entregas P12:**
- CRUD completo de **Movimentações** (entrada, saída, transferência, ajuste).
- Workflow completo de **Inventário** (abertura → contagem → conciliação automática).
- Cálculo incremental de saldo via trigger (O(1)).
- Bloqueio de saldo negativo em nível de banco.
- Integração opt-in com Vendas (RPC `baixar_estoque_venda`).

---

## 2. Funcionalidades Implementadas (P12)

### 2.1 Movimentações (`/estoque/movimentacoes`)

| Item | Detalhe |
|---|---|
| **Descrição** | Registro de entradas (compra/devolução), saídas (venda/perda/consumo), transferências entre localizações e ajustes manuais. Dialog `NovaMovimentacaoDialog` com validação Zod + React Hook Form. |
| **Status** | ✅ Ativo e funcional |
| **Fluxo UI** | Lista com filtros por tipo/produto/data → Botão "Nova Movimentação" → Formulário → Confirmação → atualização otimista via TanStack Query |
| **Integrações** | **Vendas** (via RPC `baixar_estoque_venda`, idempotente por `venda_id`); **Cadastros** (produtos, localizações) |
| **Schema/DB** | `estoque_movimentacoes` (header), `estoque_saldos` (materializado), `historico_estoque_movimentacoes` (auditoria imutável) |
| **Triggers/RPCs** | `trg_estoque_mov_saldo` (aplica delta), `trg_estoque_mov_validar_saldo_before` (impede negativo), RPCs `baixar_estoque_venda`, `estornar_estoque_venda` |
| **Limitações** | Sem custo médio ponderado; sem lote/validade/série; sem reserva de estoque; sem multi-armazém hierárquico |

### 2.2 Inventário (`/estoque/inventario`)

| Item | Detalhe |
|---|---|
| **Descrição** | Contagem cíclica com geração automática de movimentações de ajuste para conciliar divergências. |
| **Status** | ✅ Ativo e funcional |
| **Fluxo UI** | `NovoInventarioDialog` (define escopo) → tela de contagem por item → `ConciliacaoView` (diffs) → RPC `conciliar_inventario` gera ajustes |
| **Integrações** | **Cadastros** (snapshot de produtos no momento da abertura) |
| **Schema/DB** | `estoque_inventarios` (header + status), `estoque_inventario_itens` (contagem por SKU) |
| **Triggers/RPCs** | `conciliar_inventario` (idempotente, cria movimentações de ajuste) |
| **Limitações** | Sem contagem cega; sem múltiplos contadores; sem congelamento de saldo durante contagem; sem inventário parcial por categoria/curva |

---

## 3. Funcionalidades Pendentes / "Em Breve"

| # | Funcionalidade | Localização UI | Escopo | Prioridade |
|---|---|---|---|---|
| 1 | **Relatórios de Estoque** | `/estoque/relatorios` (rota inexistente) | Giro, curva ABC, posição por localização, produtos parados, ruptura | 🔴 Alta |
| 2 | **Custo Médio Ponderado** | Campo em `estoque_saldos` + coluna nas listas | Cálculo automático a cada entrada; base para CMV | 🔴 Alta |
| 3 | **Reserva de Estoque** | Integração Vendas/Orçamento | Reservar saldo em orçamento aprovado antes da NF | 🟡 Média |
| 4 | **Lote / Validade / Nº Série** | Novo campo em movimentações | Rastreabilidade fiscal (FEFO/FIFO) — pré-requisito para P13 completo | 🟡 Média |
| 5 | **Kardex por produto** | Drill-down no cadastro do produto | Extrato cronológico de todas as movimentações | 🔴 Alta |
| 6 | **Alertas de Ruptura / Ponto de Pedido** | Dashboard + notificações | Estoque mínimo/máximo por SKU × localização | 🟡 Média |
| 7 | **Importação em massa (CSV)** | Botão em Movimentações e Inventário | Onboarding e correções em lote | 🟢 Baixa |
| 8 | **Exportação (Excel/PDF)** | Botão em cada listagem | Auditoria externa e conferência contábil | 🟢 Baixa |
| 9 | **Integração com NF-e de entrada (XML)** | `/estoque/entradas-xml` | Ler XML de NF-e do fornecedor e gerar movimentação — depende P13 | 🟡 Média (bloqueado por P13.2) |
| 10 | **Transferência multi-etapa (em trânsito)** | Novo status em transferências | Origem baixa, destino confirma recebimento | 🟢 Baixa |

---

## 4. Dependências e Integrações

### Internas
- **Vendas** → consome `baixar_estoque_venda` / `estornar_estoque_venda` (opt-in, idempotente por `venda_id`).
- **Cadastros** → depende de `produtos`, `localizacoes_estoque`, `unidades_medida`.
- **Fiscal (P13)** → futura dependência: cada NF-e autorizada deve casar com uma movimentação de estoque (chave: `venda_id`/`documento_id`).
- **Financeiro** → indireta: valorização do estoque (custo médio) alimentará CMV no DRE futuro.
- **RLS** → todas as tabelas isoladas por `empresa_id` (tenant).

### Externas
- Nenhuma dependência externa ativa hoje.
- **Potenciais:** parser de XML de NF-e (biblioteca ou Edge Function), integração com WMS de terceiros, leitores de código de barras (mobile PWA).

---

## 5. Pontos de Atenção e Próximos Desafios

### Riscos técnicos
1. **Ausência de custo médio** bloqueia relatórios financeiros de valorização e apuração fiscal precisa.
2. **Sem lote/validade** impede rastreabilidade exigida por vigilância sanitária/ANVISA em setores regulados.
3. **Sem congelamento durante inventário** — movimentações concorrentes podem gerar divergência entre contagem e saldo real. Mitigação atual: orientação operacional; mitigação técnica pendente.
4. **`estoque_saldos` materializado** — depende exclusivamente da trigger; qualquer bypass (INSERT direto sem trigger) corrompe o saldo. Recomenda-se job de reconciliação semanal.
5. **Performance de listagens** — sem paginação server-side em movimentações; volumetria alta (>50k linhas) degradará UX.

### Sugestões para a próxima Sprint (P14 — Estoque Fase 2)
- **P14.1:** Kardex + Relatórios (giro, ABC, ruptura) — desbloqueia decisão gerencial.
- **P14.2:** Custo médio ponderado + valorização — pré-requisito para DRE e P13 completo.
- **P14.3:** Lote/validade opcional por produto — flag no cadastro.
- **P14.4:** Job de reconciliação `estoque_saldos` (nightly) + alertas de divergência.

---

## Checklist de Estado

| Critério | Status |
|---|---|
| CRUD Movimentações | ✅ |
| CRUD Inventário + Conciliação | ✅ |
| Saldo incremental via trigger | ✅ |
| Bloqueio de saldo negativo | ✅ |
| RLS por tenant | ✅ |
| Integração Vendas (opt-in) | ✅ |
| Relatórios analíticos | ❌ Pendente |
| Custo médio | ❌ Pendente |
| Lote/validade/série | ❌ Pendente |
| Kardex | ❌ Pendente |
| Reconciliação de saldo (job) | ❌ Pendente |

**Recomendação:** GO para planejar **P14 — Estoque Fase 2** com foco em Relatórios + Custo Médio + Kardex.
