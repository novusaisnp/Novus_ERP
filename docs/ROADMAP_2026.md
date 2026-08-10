# NOVUS ERP — Roadmap 2026

Backlog priorizado e próximos passos, olhando pra frente. Para o que já foi feito e o histórico
de cada sessão, ver [`STATUS.md`](./STATUS.md) — não duplicar aqui, esse arquivo é sobre o que
falta, não sobre o que já foi entregue.

---

## 🚧 Em Progresso — Fase 2 Design

### Camada de Adaptadores por Satélite
- **Escopo:** tradução de payload de cada satélite → contratos canônicos (Portas 1/2), orquestração de chamadas (Porta 3 antes)
- **Estado:** desenhado em `CONTRATOS_CANONICOS_ERP.md` §10 Fase 2, não iniciado
- **Bloqueador:** esperando satélite Educacional real como caso de validação (não abstrair sem dado real)
- **Esforço:** médio (configurable por `source_system`, reuso de "Regras de Classificação de Receita")

### Envelope em Todas as Tabelas (Fase 1b)
- **Escopo:** `clientes`, `produtos`, `contratos`, `estoque_movimentacoes`, `liquidacoes_titulos` ganham `origem_sistema`, `origem_canal`, `externo_id`, `idempotency_key`, `hash_payload`
- **Estado:** desenhado, não iniciado
- **Esforço:** baixo (migração aditiva, nenhuma coluna para remover)

---

## 📋 Backlog — Fase 3+ (Priorizado)

### Tier 1 — Bloqueantes para Satélite Educacional Real

1. **Webhook de Saída + Catálogo de Eventos** (2-3 dias)
   - Infraestrutura já existe (`Webhooks.tsx`, `WebhookConfigModal`)
   - Falta: lista de eventos (`novo_cliente_cadastrado`, `estoque_baixo`, `pagamento_recebido`, etc.)
   - Falta: disparo automático dos eventos quando os eventos de negócio acontecem
   - **Impacto:** Educacional precisa ser notificado de mudanças em alunos, pagamentos, etc.

2. **Comissionamento de Vendedor** (3-4 dias)
   - Tabela: `vendedor_comissao` (vendedor_id, tipo_calculo, percent/fixo, data_inicio, data_fim, ativo)
   - Relatório: comissões por vendedor/período, regras por categoria de produto
   - **Dependência:** vendedor/operador já existe em Venda, falta só a tabela e lógica de cálculo

3. **Fluxo Rápido/Balcão em Vendas** (2-3 dias)
   - Atalho: venda sem formulário de edição (select cliente, adicionar itens por SKU/código rápido, pagar, pronto)
   - Não precisa ser "POS full" — é um atalho dentro do fluxo de venda já existente

4. **Desconto Percentual em Venda** (1-2 dias)
   - Hoje só aceita desconto fixo
   - Adicionar coluna `desconto_percent` em `venda_itens`, aplicar na subtotalização

### Tier 2 — Funcionalidade Estendida (depois de Satélite Educacional estável)

5. **Fiscal Completo** (5+ dias, maior)
   - Hoje: `fiscal-emitir-nfe` (edge function, não testada de verdade)
   - Adicionar: NFC-e, CCe (carta de correção), contingência DPEC, consulta status

6. **RH/Folha de Pagamento** (6+ dias, maior)
   - Hoje: esqueleto (tabelas `colaboradores`, integração Ponto morta)
   - Adicionar: cálculo real (base, INSS, IR, FGTS, benefícios), holerite, GPS/DARF, fechamento mensal
   - **Dependência:** comissionamento (Tier 1 item 2) já precisa de `usuarios.vendedor_id`, folha precisa de `colaborador.comissao`
   - **Padrão:** risco de complexidade, considerar outsource (Omie API, BHub) vs. in-house

7. **Estoque de Bem Locável** (4-5 dias, design + schema)
   - Gap identificado: modelo atual é "quantidade fungível", não "unidade serializada"
   - Precisa: bem + serial, status (disponível/locado/revisão), devolução esperada
   - Tabela: `estoque_bens_locaveis` (bem_id uuid, serial, status, cliente_atual_id, data_devolucao_prevista, ...)
   - **Bloqueante para:** satélite de locação de equipamentos (Fase 4 de `CONTRATOS_CANONICOS_ERP.md`)

8. **Custom Fields por Tenant** (4+ dias, decisão grande)
   - Hoje: schema fixo em todas as tabelas core
   - Opções: coluna `metadata jsonb` por tabela vs. tabela EAV separada
   - **Bloqueador:** decisão de arquitetura + schema, não é "adicionar biblioteca"

### Tier 3 — Observabilidade e Manutenção

9. **Dashboard de Saúde de Integração** (2-3 dias)
   - `SyncDashboard` hoje mede por webhook, não por satélite/source_system
   - Adicionar: volume de eventos ingeridos por satélite, taxa de erro, latência média, últimas falhas
   - Padrão: reaproveitar `sync_webhook_events` log table já existente

10. **Remover erros `@typescript-eslint/no-explicit-any`** (2 dias)
    - Pré-existentes, não prioridade crítica — mas acumula dívida técnica
    - Planejado: arquivo por arquivo, com typecheck + suíte entre cada um

---

## 🎯 Próximos Sprints (Sugerido)

### Sprint 1
1. **Webhook de Saída + Catálogo de Eventos** — destravar notificações do Educacional
2. **Comissionamento** — resolve vendedor + gerenciamento de comissão

### Sprint 2
1. **Envelope em Todas as Tabelas (Fase 1b)** — paridade de ingestão
2. **Desconto Percentual em Vendas** — simples, alto impacto UX
3. **Fluxo Rápido/Balcão** — maior ganho pra pequeno negócio

### Sprint 3
1. **Adaptador Satélite Educacional (Fase 2)** — testa de verdade o design de integração
2. **Dashboard de Saúde de Integração** — observabilidade

---

## ⚠️ Riscos Conhecidos (fora do que já vive em `CLAUDE.md`)

| Risco | Nível | Status | Mitigação |
|-------|-------|--------|---|
| **Vendor Lock-in Supabase** | alto | 📝 registrado | Fronteira de serviço (`src/services/**`) reduz escopo de migração; não abrir abstração sem alternativa real |
| **Coluna PRIMARY KEY faltando em migração aplicada fora do fluxo** | médio | ✅ achado e corrigido 2026-08-09 | Ver `STATUS.md` — se aparecer de novo, checar `ALTER TABLE ... ADD PRIMARY KEY` |
| **Async sync de CPF/CNPJ com satélite** | médio | 📝 identificado | Nunca fabricar CPF/CNPJ placeholder — colide cliente distinto no mesmo registro do ERP; skill `erp-satellite-integration` |
| **Conciliação bancária (funções stub)** | baixo | 📝 P15 ainda não implementada | `sugerir_matches_extrato`, `confirmar_match`, etc. retornam `NOT_IMPLEMENTED_P15_1` |
| **Relação Venda↔Orçamento** | baixo | 🟡 parcial | Dois fluxos com validação em paralelo + gap de exceção auditada; documentado em `CONTRATOS_CANONICOS_ERP.md` §6 |

## 🎲 Completude por Fase

| Fase | Objetivo | Estado |
|------|----------|--------|
| **Fase 1** | Contratos formalizados, Porta 3 crédito | ✅ concluído |
| **Fase 1b** | Envelope em todas tabelas | 🔴 não iniciado |
| **Fase 2** | Adaptador satélite genérico | 🟡 design pronto, não iniciado |
| **Fase 3** | Crédito/inadimplência operacional; Comissionamento | 🟡 crédito ok, comissão pendente |
| **Fase 4** | Bem locável (para locadora) | 🔴 não iniciado |
| **Fase 5** | Observabilidade multi-origem | 🔴 não iniciado |

## 📞 Decisões Pendentes do Usuário

1. **Próxima frente funcional após Tier 1?** — Tier 2 sugerido (fiscal/folha), confirmar prioridade
2. **Custom fields: arquitetura?** — `metadata jsonb` vs. EAV, decidir antes de começar
3. **Fluxo rápido de Estoque/Vendas — formato?** — atalho dentro de Vendas vs. "modo balcão" separado?
4. **Comissionamento — complexidade?** — percentual fixo por vendedor vs. regras por categoria/período?
