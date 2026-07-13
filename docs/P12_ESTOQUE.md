# P12 — Módulo de Estoque

## Status: PASS_P12

Implementação completa do Módulo de Estoque conforme plano P12.

## Schema (5 tabelas)

- `estoque_movimentacoes` — entradas, saídas, transferências, ajustes e movimentos de inventário. FK para `produtos`, `localizacoes_estoque`, `vendas`, `estoque_inventarios`. Índices: empresa+data, produto+data, venda parcial, inventário parcial, deleted_at. Unique parcial `(venda_id, produto_id) WHERE tipo='SAIDA' AND deleted_at IS NULL` garante idempotência.
- `estoque_inventarios` — cabeçalho com código (unique por empresa), localização, status (RASCUNHO|EM_CONTAGEM|CONCILIADO|CANCELADO).
- `estoque_inventario_itens` — 1 linha por produto contado. `diferenca` é `GENERATED ALWAYS AS (saldo_contado - saldo_sistema) STORED`.
- `estoque_saldos` — saldo materializado por `(empresa, produto, localizacao)` mantido incrementalmente por trigger.
- `historico_estoque_movimentacoes` — log imutável (INSERT/UPDATE/DELETE + snapshot JSONB antes/depois + usuario_id).

## RLS

Todas as tabelas com RLS ativa. Policies: `has_role('admin') OR user_has_access_to_empresa(empresa)` em SELECT/INSERT/UPDATE/DELETE. Histórico: apenas SELECT para authenticated. GRANTs explícitos para `authenticated` e `service_role`; sem `anon`.

## Triggers e RPCs

- `trg_estoque_mov_saldo` (AFTER INSERT/UPDATE/DELETE) → `recalc_saldo_estoque`: recomputa saldo e custo médio ponderado por localização impactada.
- `trg_estoque_mov_validar_saldo_before` (BEFORE INSERT) → bloqueia saída/transferência sem saldo (`SALDO_INSUFICIENTE`).
- `trg_estoque_mov_auditoria` (AFTER INSERT/UPDATE/DELETE) → registra em `historico_estoque_movimentacoes`.
- `validar_saldo_estoque(produto, localizacao, qtd)` → RPC STABLE para uso client-side.
- `baixar_estoque_venda(venda_id, localizacao_id)` → gera SAIDAs agregadas por produto, idempotente via unique parcial.
- `estornar_estoque_venda(venda_id)` → soft-deleta SAIDAs e cria ENTRADAs compensatórias.
- `conciliar_inventario(inventario_id)` → gera AJUSTE_POSITIVO/AJUSTE_NEGATIVO para cada divergência, marca inventário como CONCILIADO. Idempotente (replay retorna gerados=0).

## UI

- `/estoque/movimentacoes` (`MovimentacoesEstoque`) — lista filtro por texto (produto/código/documento/tipo), badges tipados por token semântico, dialog com 3 abas (Entrada/Saída/Transferência).
- `/estoque/inventario` (`InventarioEstoque`) — lista de inventários, criação com auto-populate de itens via `estoque_saldos`, tela de conciliação inline com edição de contagem (blur → save) e botão Conciliar.
- Rotas `EmBreve` substituídas em `src/App.tsx`.

## Integração com Vendas

- `baixar_estoque_venda(venda_id, localizacao_id)` disponível para consumo pelo fluxo de venda. **Não** foi adicionado trigger automático em `vendas` para preservar o fluxo existente P1–P8 (contratos preservados). A baixa deve ser invocada explicitamente pela UI/serviço de Vendas quando `controla_estoque=true`.
- `estornar_estoque_venda(venda_id)` para cancelamentos.
- Auditoria: padrão `historico_estoque_movimentacoes` isolado do domínio bancário.

## Performance

- Índices em todos os padrões de acesso críticos.
- Saldos O(1) via `estoque_saldos` (materializado por trigger).
- Custo médio ponderado calculado apenas em ENTRADA/AJUSTE_POSITIVO.

## Riscos Remanescentes

1. Baixa por venda não é automática — requer chamada explícita no fluxo de vendas (decisão de segurança para não impactar P1–P8).
2. Race em vendas concorrentes: mitigado por trigger BEFORE INSERT que valida saldo dentro da transação; validação leve não usa `FOR UPDATE` — em cenários de alta concorrência recomenda-se lock explícito na RPC.
3. Custo médio simples (média aritmética entre ENTRADAs); custo FIFO/LIFO não implementado.

## Critérios PASS/FAIL

| Fase | Critério | Status |
|---|---|---|
| P12.1 | 5 tabelas + RLS + GRANTs + índices | ✅ PASS |
| P12.2 | UI movimentações + inventário + validação saldo | ✅ PASS |
| P12.3 | RPCs de baixa/estorno + auditoria | ✅ PASS |
| P12.4 | Trigger de saldo + RLS por tenant | ✅ PASS |

**Status final: PASS_P12**
