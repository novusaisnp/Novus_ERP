# Auditoria Funcional Completa — NOVUS ERP (2026-08-15/16)

> Substitui `SYSTEM_AUDIT.md` e os `docs/AUDITORIA_*` de julho/2026, que estavam
> desatualizados e não refletem o schema/arquitetura atuais. Este documento é a
> fonte de verdade a partir de agora — para pendências correntes ver `docs/STATUS.md`,
> para backlog priorizado ver `docs/ROADMAP_2026.md`.

## Metodologia

Passagem módulo por módulo e modal por modal (visíveis e ocultos) de todo o
`novusai-erp`, contra **duas fontes**, não uma:

1. **Código real** — árvore limpa em `725b509` (2026-08-15), varredura de todas as
   85 rotas, 52 itens de sidebar, 78 services, 238 componentes fora de `ui/`, 3
   agentes de exploração dedicados por domínio (Financeiro/Bancária/Contratos,
   Cadastros/Estoque/Vendas/Fiscal, RH/Config/Integração/Auth/Rotas globais).
2. **Banco real** (`reksodqzemboaeqxnxyy`) — `supabase db advisors` (security +
   performance), diff `pg_policies` × migrations declaradas, diff de RPCs
   chamadas × funções existentes, diff de tabelas/views referenciadas × schema real,
   leitura direta de `has_role()` e políticas de tabelas críticas.

Os achados mais graves só apareceram na segunda fonte — nenhuma leitura de código,
por mais cuidadosa, mostraria que uma tabela com RLS habilitada não tem nenhuma
policy. Ambas as fontes eram necessárias.

**Convenção de estado por componente:** `OK` (funciona, real) · `PARCIAL` (funciona
com ressalva relevante) · `FACHADA` (parece funcionar, não persiste/não executa
nada) · `ÓRFÃO` (código existe, ninguém alcança).

---

## Resumo executivo

| Métrica | Valor |
|---|---|
| `npm run typecheck` | ✅ limpo (exit 0) |
| `npm run test -- --run` | ✅ 53 arquivos / 383 testes |
| Código de app | ~71.400 linhas, 654 arquivos TS/TSX |
| Rotas registradas | 85 · itens de sidebar: 52 |
| Services | 78 (apenas **9 com teste**) |
| Componentes fora de `ui/` | 238 (apenas **21 com teste**) |
| Migrations | 151 · Edge Functions: 29 |
| Comentários `TODO/FIXME` reais | **1** (código limpo de marcadores — os defeitos são funcionais, não anotados) |
| `console.*` fora de `ui/` | 682 (89 arquivos) |
| Acesso direto ao Supabase fora de `src/services/**` | 16 arquivos (viola regra do `CLAUDE.md`) |
| `: any` | 48 ocorrências, 1 por arquivo na maioria |

**Conclusão central:** os portões verdes (typecheck, testes, build) escondem o
problema real. Os defeitos não estão no que o compilador vê — estão em banco
desalinhado das migrations, botões sem handler, e features construídas mas nunca
conectadas a uma rota, um menu ou um `onSave`.

---

# BLOCO 1 — CRÍTICO: banco desalinhado com as migrations
2
Achado só possível consultando o projeto real. Provável sequela da migração de
projeto Supabase (`lrkebsznehpuascgqbri` → `reksodqzemboaeqxnxyy`, 2026-08-08):
as tabelas vieram, parte das policies não.

## 1.1 Conciliação bancária inteira está morta para o usuário final

5 tabelas com **RLS habilitada e ZERO policies** — confirmado por consulta direta
a `pg_policies` no banco real (retorno vazio para todas):

- `banco_extratos_importados`
- `banco_movimentacoes_extrato`
- `banco_regras_conciliacao`
- `banco_conciliacao_log`
- `entidade_id_map`

A migration `20260713174159_166f4252-….sql` **declara** as 14 policies correspondentes
(`bei_select/insert/update/delete`, `bme_*`, `brc_*`, `bcl_select/insert`) — elas
simplesmente não existem no banco hoje.

`conciliacaoService` (`src/services/conciliacao/conciliacaoService.ts:15,26,36,115-148`)
lê essas tabelas direto pelo client. Com RLS sem policy nenhuma, **`SELECT` retorna
lista vazia sem erro** e qualquer escrita falha com `42501`. Ou seja: o módulo que a
leitura de código aponta como o mais bem construído do sistema (RPCs reais de matching,
sem placeholder algum) está, na prática, **inoperante** para qualquer usuário
`authenticated` — e falha do jeito mais enganoso possível, parecendo "não tem nada
para conciliar" em vez de erro.

Diff completo migrations × banco: **36 policies declaradas e ausentes**. As demais 22
do diff são renomeações legítimas de tabela (`clientes`/`fornecedores`/`colaboradores`
→ `entidades`) e não representam bug.

## 1.2 Buckets de Storage fiscais não existem

Código referencia os buckets `fiscal-certificados`, `fiscal-danfe`, `fiscal-xml`.
No projeto real só existem `empresa-certificados` e `empresa-logos`. Qualquer
caminho fiscal fora do modo mock quebraria ao tentar persistir XML/DANFE.

## 1.3 RLS não escala — 331 avisos `auth_rls_initplan`

`supabase db advisors --type performance`: **331 policies** chamam `auth.uid()`
diretamente na condição em vez de `(select auth.uid())`, forçando reavaliação da
função **por linha** varrida, não uma vez por query. Isso, sozinho, inviabiliza o
critério de saída da FIN-2 do roadmap ("listas permanecem utilizáveis com 1 milhão
de títulos"). Correção é mecânica (find/replace guiado por padrão) e de baixo risco,
mas em 331 lugares — não é trivial em volume.

Também: 6 avisos de `multiple_permissive_policies` (policies redundantes na mesma
tabela/ação, cada uma reavaliada à toa).

## 1.4 Superfície de ataque das RPCs

`supabase db advisors --type security`: 0 erros, 109 avisos. O que importa:

- **44 funções `SECURITY DEFINER` com `EXECUTE` concedido a `anon`**, incluindo
  `financeiro_liquidar_titulo`, `financeiro_salvar_titulo`, `financeiro_cancelar_titulo`,
  `financeiro_consumir_autorizacao`, `baixar_estoque_venda`, `criar_lancamento_do_extrato`,
  `confirmar_match`, `desfazer_conciliacao`, `is_novus_owner`. A maioria checa
  `auth.uid()` internamente antes de agir, mas o `GRANT EXECUTE TO anon` em si é
  desnecessário e amplia a superfície — deveria ser `authenticated`.
- 4 funções com `search_path` mutável (`validate_required_user_fields`,
  `sync_contas_bancarias_ativo_status`, `sync_movimentacoes_bancarias_legacy_fields`,
  +1) — vetor clássico de sequestro de função em bancos multiusuário.
- `leaked_password_protection` desligado no Auth (Supabase oferece checagem contra
  senhas vazadas conhecidas; está desativada).

**Verificado e OK, não é achado:** todas as 36 RPCs chamadas pelo código existem
de fato no banco; todas as 83 tabelas/views referenciadas pelo código existem (a
única referência a uma tabela inexistente, `colaboradores`, está dentro de um
comentário morto em `auditableCentroCustoService.ts:26`, não em código executável).

## 1.5 `has_role()` não filtra empresa — e a variante correta já existe

Definição lida diretamente do banco:

```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id=_user_id AND role=_role)
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id=_user_id AND role='novus_owner')
$$
```

Nenhuma menção a `empresa_representada_id`. Cerca de **146 policies** usam o padrão
`empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin')`
(confirmado em `folha_pagamento`, `colaboradores`, `cargos`, `departamentos`,
`beneficios_vinculados`, `registros_ponto`, `integracoes_ponto` —
`20260710180530_*.sql:16-254`, entre outras). Consequência literal: **um usuário com
role `admin` lê e escreve nessas ~146 tabelas em qualquer empresa**, não só na sua.

**Não é bug não-intencional isolado — é uma decisão de desenho que hoje colide com
como `admin` é atribuído na prática.** `docs/STATUS.md` registra que o teste de
isolamento entre empresas da FIN-0 excluiu de propósito `admin` e `novus_owner`,
"porque esses papéis atravessam empresas por desenho". A pergunta que fica em aberto
é de produto, não de código: **`admin` foi pensado como papel interno NOVUS
(atravessa tudo por design) ou é hoje atribuível a um usuário de empresa cliente
comum?** Achado concreto que aponta para o segundo caso:
`src/pages/configuracoes/Usuarios.tsx:96-134` permite que qualquer admin promova
qualquer usuário (inclusive a si mesmo) a `admin` a partir do fluxo "Resetar senha" —
sem gate adicional de `novus_owner`.

O ponto que torna a correção viável sem inventar vocabulário novo: **a função
`has_role_for_empresa` já existe no banco** e não é a usada nas ~146 policies. A
borda de UI tem a mesma raiz: `AdminRoute` (`src/components/auth/AdminRoute.tsx:14-35`)
e a checagem de `RelatoriosOps.tsx:31-36` usam `checkHasRole(user.id,'admin')`
(`src/utils/authUtils.ts:4-11`), que chama a mesma `has_role()` sem escopo de empresa.
Todas as 4 rotas hoje marcadas "admin-only" (`SyncDashboard`, `CamposPersonalizados`,
`RelatoriosOps`, `DashboardFiscal`) herdam essa mesma ambiguidade.

## 1.6 `sync_logs` sem escopo de tenant

`sync_logs` não tem coluna `empresa_representada_id` e sua RLS é
`FOR ALL USING (true) WITH CHECK (true)` (`20250707211441-*.sql:126-127`);
`src/hooks/useSyncStatus.ts:58-70` e `useSyncLogs.ts` consultam a tabela direto do
client, sem filtro. Qualquer usuário que alcance `/integracao/sincronizacao` (hoje
atrás do mesmo `has_role` ambíguo do item 1.5) vê — e pode potencialmente apagar —
logs de sincronização de todas as empresas do sistema, não só da sua.

---

# BLOCO 2 — Módulos inteiros invisíveis por feature flag

`src/lib/featureFlags.ts` define três flags lidas de env; `.env` do projeto não
define nenhuma delas, então todas resolvem para `false`.

No app rodando hoje, **o menu Estoque mostra só Produtos e Categorias**
(`sidebarVisibility.ts:11-14,48-54`). Estão construídos, testados e escondidos:

- Estoque → Localizações, Unidades de Medida, Tamanhos
- Estoque → Movimentações, Inventário (workflow completo: abertura → contagem →
  conciliação automática via RPC `conciliar_inventario`)
- Estoque → hub de Relatórios + Giro, Curva ABC, Posição, Parados, Ruptura (todos
  com dado real, a maioria já paginada)
- Configurações → Sistema (mas esta é fachada mesmo estando visível — ver Bloco 3.3)
- Integração → Sincronização (`SyncDashboard`, funcional, mas com o vazamento
  cross-tenant do item 1.6)

**Inconsistência de segurança, não só de produto:** o comentário no topo do arquivo
diz "módulo oculto do sidebar **e das rotas**" — mas isso é falso hoje. `App.tsx`
não consulta `featureFlags` em lugar nenhum das definições de `<Route>`; a flag
esconde apenas o **item de menu**. Digitar `/estoque/inventario` na barra de
endereço abre a tela normalmente para qualquer usuário logado. Se a intenção é
realmente controlar o que está "fora do go-live inicial", a rota precisa do mesmo
gate.

**Nota de qualidade a favor do sistema:** o Kardex (`/estoque/kardex/:produtoId`,
também sem entrada própria no menu, acessível só por link a partir de Produtos/
Movimentações) é o **único módulo de todo o ERP com paginação server-side completa**
(limit/offset real + "Mostrando X–Y de Z", `relatoriosService.ts:35-61`) — é a
referência de boa prática a copiar no Bloco 4.

---

# BLOCO 3 — Módulo por módulo

## Financeiro

### Contas a Pagar — `/financeiro/contas-pagar` (no menu)

| Componente | Estado | Evidência |
|---|---|---|
| `ContasPagar.tsx` (página) | **PARCIAL** | `src/pages/financeiro/ContasPagar.tsx:65-88` |
| `ContasPagarForm` / `RateioManager` | OK | `src/components/financeiro/contas-pagar/*` |
| Liquidação/estorno/cancelamento (RPCs) | OK | `src/services/movimentacoesService.ts:57` |

**Lacunas:**
- `handleSubmit` monta um objeto `callback` com `onSuccess`/`onError` mas **nunca o
  passa** para `criar()`/`atualizar()` (que são `mutate`, não `mutateAsync`); fecha o
  modal e resolve a Promise **antes** da mutation terminar. Uma falha de gravação no
  banco passa despercebida pelo usuário — o modal já fechou. Compare com
  `ContasReceber.tsx:52-67`, que aguarda `onSuccess`/`onError` corretamente.
- Sem paginação (ver Bloco 4).

### Contas a Receber — `/financeiro/contas-receber` (no menu)

| Componente | Estado | Evidência |
|---|---|---|
| `ContasReceber.tsx` / `ContaReceberFormModal` | OK | `src/pages/financeiro/ContasReceber.tsx:52-67` |

**Lacunas:**
- Sem paginação (Bloco 4).
- Geração automática de título ao ligar `gera_financeiro` em um Contrato **existente**
  não dispara nada — a trigger só cobre `AFTER INSERT` (ver Contratos, abaixo).

### Movimentações Financeiras — `/financeiro/movimentacoes` (no menu)

Página-casca que abre um modal no `mount` e usa `window.history.back()` como "fechar"
(`MovimentacoesFinanceiras.tsx:9-11`) — funciona, mas é um desenho estranho.

| Componente/aba | Estado | Evidência |
|---|---|---|
| `MovimentacoesModal` (lista de títulos) | OK | `src/components/financeiro/MovimentacoesModal.tsx` |
| Aba Detalhes | OK | dado real |
| Aba Rateios (`RateiosTab`) | OK, com debug visível | `RateiosTab.tsx:143-145` |
| Aba Histórico | OK | `useMovimentacoesCompletas.ts:116-123` |
| **Aba Documentos** | **FACHADA** | ver abaixo |
| Liquidação/Estorno/Cancelamento + `AutorizacaoFinanceiraModal` | OK, com autorização real via edge function | `LiquidacaoTituloModal.tsx` |

**Lacunas:**
- **Upload de documento é 100% fachada.** `uploadDocumento` nunca envia o arquivo ao
  Storage — grava uma linha em `documentos_titulos_financeiros` com uma **URL
  simulada**. O próprio código confirma: comentário "implementar quando storage
  estiver configurado... por enquanto, simular URL" —
  `src/services/movimentacoesService.ts:314-337` (lido linha a linha).
- Botões **Visualizar** e **Download** de cada documento não têm `onClick` —
  `src/components/financeiro/movimentacoes/DocumentosTab.tsx:325-330`.
- Texto de debug em produção: "Debug: {rateios.length} rateios carregados" —
  `RateiosTab.tsx:143-145`.
- `console.log` de dados de negócio espalhados nos componentes
  (`MovimentacoesModal.tsx:48,73,78,84`; `RateiosTab.tsx:24-26,54`; `HistoricoTab.tsx:28`).

### Fluxo de Caixa — `/financeiro/fluxo-caixa` (no menu)

| Componente | Estado | Evidência |
|---|---|---|
| `FluxoCaixaPage` | PARCIAL | `src/pages/financeiro/FluxoCaixaPage.tsx` |
| `FluxoCaixaFiltros` | PARCIAL (1 filtro fachada) | `FluxoCaixaFiltros.tsx:82-96` |

**Lacunas:**
- Filtro **"Período" (Diário/Semanal/Mensal) não afeta nada** — `periodo_agrupamento`
  é lido/gravado só dentro do próprio componente de filtro; nenhum outro arquivo
  (`fluxoCaixaService.ts`, `useFluxoCaixa.ts`, gráfico) o consome. O gráfico sempre
  agrupa por dia — `FluxoCaixaFiltros.tsx:82-96`.
- Botão **"Atualizar"** só re-executa a query de movimentações; resumo, projeção e
  estatísticas não são atualizados por esse botão — `useFluxoCaixa.ts:102-105`.
- Fallback de datas hardcoded `2024-01-01`/`2025-12-31` quando filtros vêm vazios —
  já vencido frente à data atual — `fluxoCaixaService.ts:45-46,68-69`.
- Heurísticas fixas não documentadas na UI: "capital de giro" = 70% do saldo, "saldo
  mínimo" = 10% do capital de giro, "runway" = saídas/30 fixo — `fluxoCaixaService.ts:265-272`.
- Sem paginação: duas queries completas (`contas_pagar`, `contas_receber`) por
  chamada, sem `.range()` — `fluxoCaixaService.ts:30-71`.

### Fluxo por Competência — `/financeiro/fluxo-competencia` (no menu) — **OK**

Sem lacunas relevantes — RPC `relatorio_fluxo_competencia`, sem dado fixo.

### Plano de Contas — `/financeiro/plano-contas` (no menu) — **OK**

### Relatórios Financeiros — `/financeiro/relatorios` (no menu) — **OK**

Tela madura: agrupamento, drill-down, comparação de período, insights, agendamento,
export — tudo ligado a dado real. Herda a falta de paginação dos hooks subjacentes.

### Configurações Básicas — `/financeiro/config-basicas` (no menu) — **OK**

CRUD real e completo para Natureza, Modalidade, Planos de Pagamento e Modalidade API.

---

## Gestão Bancária

### Bancos — `/gestao-bancaria/bancos` (no menu)

| Componente | Estado | Evidência |
|---|---|---|
| `Bancos` / `BancosModal` | OK | `src/services/bancoService.ts` |
| **`src/components/financeiro/bancos/*`** (6 arquivos) | **ÓRFÃO** | zero imports em todo `src/` |

Diretório inteiro (`BancoCard`, `BancoEmptyState`, `BancosContent`, `BancosFilters`,
`BancosHeader`, `BancosStats`) duplica os componentes reais de
`gestao-bancaria/bancos/*` sem ser usado por nada — dívida técnica que confunde
quem for mexer no módulo.

### Agências / Contas Bancárias — no menu — **OK**, sem lacunas relevantes.

### Movimentações Bancárias — `/gestao-bancaria/movimentacoes-bancarias` (no menu)

Mesmo padrão "página-casca que abre modal" das Movimentações Financeiras.

| Componente | Estado | Evidência |
|---|---|---|
| Aba Movimentações (tabela+filtros+stats) | OK | — |
| **Aba "Extrato Avançado"** | **FACHADA explícita** | `MovimentacoesBancariasModal.tsx:186-195`, texto "Em desenvolvimento" |
| Aba Histórico | OK | `HistoricoMovimentacoes.tsx` |
| **"Visualizar"** (menu de ações da linha) | **FACHADA** | seta `selectedMovimentacao`, nunca lido — `MovimentacoesBancariasTable.tsx:294-304` |
| **"Editar"** (mesmo menu) | **FACHADA** | sem `onClick` — `MovimentacoesBancariasTable.tsx:308-311` |
| `NovaMovimentacaoModal` / `TransferenciaModal` | OK | `movimentacoesBancariasService.ts` |

Sem paginação: `listarMovimentacoesBancarias` sem `.range()`, com embeds de
conta+agência+banco — `movimentacoesBancariasService.ts:71-176`.

### Conciliação (índice, importar, regras, relatórios, detalhe de extrato)

Módulo **mais bem construído do repositório por leitura de código** — todas as ações
batem em RPC ou tabela real, sem placeholder algum:

| Componente | Estado | Evidência |
|---|---|---|
| `ConciliacaoIndex` | OK (código) | — |
| `ImportarExtratoPage` | OK (código) | edge function `banco-parse-extrato` |
| `ConciliacaoExtratoPage` (matching) | OK (código) | RPCs `sugerir_matches_extrato`/`confirmar_match`/`desfazer_conciliacao` |
| `RegrasConciliacaoPage` / `RegraForm` | OK (código) | CRUD real |
| `RelatoriosConciliacaoPage` | OK (código) | — |

**MAS: ver Bloco 1.1 — inoperante em produção hoje por RLS sem policy.** Esta é a
prova de que "bem construído no código" e "funciona para o usuário" são coisas
diferentes; só a checagem contra o banco real revelou o problema.

Lacuna secundária: `handleCriarLancamento` usa `window.location.reload()` para
atualizar a tela em vez de invalidar a query — `conciliacao/[extratoId]/index.tsx:57-72`.

---

## Contratos — `/vendas/contratos` (no menu, dentro de "Vendas")

| Componente | Estado | Evidência |
|---|---|---|
| `Contratos.tsx` / `ContratoFormModal` | OK, com nuance | `src/services/contratosService.ts` |

**Lacunas:**
- O switch **"Gera contas a receber"** (`gera_financeiro`) só produz efeito no
  `AFTER INSERT` do banco — ligar essa flag ao **editar** um contrato existente não
  gera nenhum título novo, e a UI não avisa. Confirmado pelo comentário da própria
  migration — `20260809233000_*.sql:10-13,44-46`.
- Sem `.range()`/`.limit()` — `contratosService.ts:6-23`.
- Contas a receber criadas pelo trigger não guardam `contrato_id` — vínculo só por
  convenção de `numero_documento`/`origem_sistema`, dificultando rastreio pela UI.

---

## Cadastros

### Entidades — `/cadastros/entidades` (no menu) — **OK**

Tela central de PF/PJ + papéis. CRUD real, colunas customizáveis persistidas,
soft-delete com checagem de dependências. Sem `.range()` em `fetchEntidades`
(`entidadeService.ts:142-163`).

### Clientes / Fornecedores — `/cadastros/clientes`, `/cadastros/fornecedores` (no menu) — **OK**

Telas satélite de leitura+delete; "Novo"/"Editar" redirecionam para Entidades com o
papel certo pré-selecionado. Sem paginação (herda de `entidadeService`).

### Serviços — `/cadastros/servicos` (no menu) — **OK**

CRUD completo, vínculo com plano de contas/centro de custo/natureza. Sem paginação
(`servicoService.ts:32-40`).

---

## Estoque

### Categorias, Localizações, Tamanhos, Unidades de Medida — no menu (as duas
primeiras) / **ocultas por flag** (as duas últimas) — **OK**

CRUD completo nas 4, nenhuma com paginação.

### Produtos — `/estoque/produtos` (no menu) — **OK**

Form completo (dados básicos/preços/estoque/fiscal/medidas/imagem/fornecedores),
com testes unitários por seção. Sem paginação (`produtoService.ts:15,31`).

### Inventário e Movimentações de Estoque — **ocultos por flag** — **OK**

`NovaMovimentacaoDialog`, `NovoInventarioDialog`, `ConciliacaoView` — todos reais,
RPC `conciliar_inventario` de verdade.

**Lacunas:**
- `listMovimentacoes` trunca em 500 registros sem avisar o usuário nem oferecer
  "carregar mais" — `estoqueService.ts:100`.
- Baixa de estoque em Vendas sempre usa `locais[0].id` — a primeira localização
  retornada pela query, não uma escolhida pelo usuário — `vendasService.ts:116-118`.
  Não é fachada, é lógica real mas questionável em empresa com múltiplos depósitos.

### Kardex — `/estoque/kardex/:produtoId` (sem entrada no menu, acessível via link) — **OK, referência**

Única tela com paginação server-side completa no repositório inteiro.

### Relatórios de Estoque — **ocultos por flag** — **OK**

Giro, Curva ABC, Posição, Parados, Ruptura — todos com RPC ou view real, a maioria
já paginada. `fetchPosicao`/`fetchRuptura` sem paginação
(`relatoriosService.ts:186-193,230-236`).

### `EmBreve.tsx` — achado dedicado

Importado em `App.tsx:39` mas **nunca usado em nenhuma `<Route>`** — import morto.
Todas as telas de Estoque foram de fato implementadas; o placeholder ficou órfão.

---

## Vendas

### Vendas (Pedidos) — `/vendas/pedidos` (no menu)

| Componente | Estado | Evidência |
|---|---|---|
| `VendaFormModal` (itens/catálogo/porta 3) | OK | checagem de crédito via `porta3Service` |
| `AutorizacaoExcecaoVendaDialog` | OK | RPC `autorizar_excecao_venda` |
| `VendaViewDialog`, `VendaAcoesMenu`, `GerarTitulosButton`, `EmitirNFeDialog` | OK | — |
| **`VendaPagamentoSection`** | **ÓRFÃO** | CRUD completo de pagamentos/parcelas de venda, **nunca importado em lugar nenhum**. Único texto de status: "Contas a receber será gerado apenas em FIN-E5" — feature planejada, nunca conectada. |

Sem paginação (`vendasService.ts:22-42`). Baixa de estoque em `locais[0]` (ver Estoque).

### Orçamentos — `/vendas/orcamentos` (no menu) — **OK**

CRUD real, conversão em venda via RPC com tratamento de erro estruturado. Sem
paginação (`orcamentosService.ts:135-143`).

### Relatórios de Vendas — `/vendas/relatorios` (no menu) — **OK**

Muito completo (gráficos, drill-down, comparação, presets, agendamento). Dispara
**duas** cargas completas de vendas quando "comparar período" está ativo — herda a
falta de paginação de `vendasService`.

---

## Fiscal

### Dashboard Fiscal — `/fiscal/dashboard` (no menu, `AdminRoute`) — **OK**

KPIs, alertas, reprocessamento, smoke mock — tudo real.

### Notas Fiscais — `/fiscal/notas-fiscais` (no menu)

| Aba | Estado | Evidência |
|---|---|---|
| Emitir / Consultar / Relatórios | OK | edge function `fiscal-emitir-nfe`, `fiscal_metrics_daily` |

**Achado central — simulação com default perigoso:**
- `fiscal-emitir-nfe` define `useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true') !== 'false'`
  — **o padrão é MOCK ATIVADO** a menos que o secret `FISCAL_MOCK=false` seja
  explicitamente configurado no projeto Supabase —
  `supabase/functions/fiscal-emitir-nfe/index.ts:88`.
- A integração real com Focus NFe existe de fato (`_shared/fiscal/providers/FocusNFeProvider.ts`,
  chamadas HTTP reais) — **não é fachada de código**, mas se o secret não estiver
  setado em produção, toda emissão continua gerando `chaveAcesso`/`protocolo` fake
  mesmo que pareça "autorizada" no ERP.
- DANFE/XML mock são gerados no client com aviso explícito "Documento sem validade
  fiscal — gerado em modo simulação" (`DetalheNFeDrawer.tsx:124`) — transparente para
  o usuário, mas reforça que sem o secret certo o fluxo inteiro é cosmético.
- Edge function `fiscal-upload-certificado` existe, **nenhuma tela da UI a chama** —
  não há como fazer upload de certificado digital A1 pelo ERP hoje.

### MDF-e — `/fiscal/mdfe` (no menu) — **OK**, mesmo padrão `FISCAL_MOCK` da NF-e.

### SPED — `/fiscal/sped` (no menu) — **fachada honesta, não é bug**

Botão "Gerar arquivo" desabilitado com card explicando o motivo: "o ERP ainda não
possui todos os registros contábeis e fiscais exigidos... gerar um TXT parcial seria
materialmente incorreto" — `pages/fiscal/SPED.tsx:29-37`. Único caso do sistema em
que a incompletude é comunicada, não escondida — **manter como referência de
padrão**, não como pendência a esconder.

### Tributos (Configurações Fiscais) — `/fiscal/tributos` (no menu), 5 abas

| Aba | Estado | Evidência |
|---|---|---|
| Configurações (emitente/Focus NFe) | OK | upsert real |
| **Naturezas** | **FACHADA** | ver abaixo |
| CFOP / NCM | OK | CRUD real |
| **Tributos (alíquotas)** | **FACHADA** | ver abaixo |

- **Naturezas de Operação não salvam nada.** `NaturezaOperacaoForm` renderizado
  **sem** prop `onSave` nos dois pontos onde é usado (`Tributos.tsx:113,146`); o
  `onSubmit` interno só faz `console.log`. E `naturezaService.ts` sequer **tem**
  função de criar/editar — mesmo ligando o `onSave`, não haveria o que chamar. A aba
  nunca lista as naturezas existentes (card estático fixo). O hook
  `useNaturezasOperacao` existe mas não é usado em lugar nenhum do app.
- **Tributos (alíquotas): CRUD 100% decorativo.** Botão "Novo Tributo" sem `onClick`
  (`TributosTab.tsx:28`); Editar/Excluir de cada linha sem `onClick`
  (`TributosList.tsx:97,100`); `tributoService.ts` só tem `fetchTributos` — não existe
  create/update/delete no backend. Usuário não consegue gerenciar alíquotas de
  ICMS/PIS/COFINS/ISS pela UI de jeito nenhum.
- `Tributos.tsx` renderiza `NaturezaOperacaoForm` **duas vezes** — dois `<Dialog>`
  independentes com o mesmo form quebrado (`Tributos.tsx:112-114,144-148`).

---

## RH

### Colaboradores / Cargos / Departamentos — no menu — **OK**

CRUD completo, tenant-scoped. `Setores` existe como lookup sem tela própria.

### Folha de Pagamento — `/rh/folha/folha-pagamento` (no menu) — **FACHADA, confirmada**

- `FolhaPagamento.tsx:59-79` é um formulário 100% manual: o usuário digita
  `salario_base`, `total_vencimentos`, `total_descontos`, `inss`, `irrf`, `fgts` na
  mão. **Zero cálculo.**
- `folhaPagamentoService.ts:29-49` só tem `listFolhas` e `criarFolha` — sem
  `update`/`delete`.
- `criarFolha` **nunca consulta** `vencimentos_padrao`/`descontos_padrao`/
  `beneficios_vinculados` — os três catálogos abaixo existem e nunca alimentam a folha.
- Nenhuma edge function ou lib de cálculo de INSS/IRRF/FGTS por tabela existe no repo.
- Confirma o próprio `ROADMAP_2026.md:189`: "Folha real ou integração homologada;
  decidir build × parceiro antes de implementar cálculos" — pendência já reconhecida.

### Vencimentos Padrão / Descontos Padrão / Benefícios Vinculados — no menu — **catálogos mortos**

CRUD completo e real em todos os três, mas **nenhum é consumido pela Folha** —
servem hoje só de cadastro decorativo.

### Registros de Ponto — `/rh/registros-ponto` (no menu) — **FACHADA (só leitura)**

`registrosPontoService.ts:15-25` **só tem `listRegistros()`**. Não existe `create`,
`import`, nem qualquer via de entrada de dado pela UI, nem edge function de
ingestão. A tela exibe filtros e uma tabela de uma fonte que o sistema nunca popula.

### Integração de Ponto — `/rh/folha/integracao-ponto` (no menu) — **FACHADA (config sem execução)**

CRUD de configuração completo (nome/tipo/endpoint/token/JSON —
`IntegracaoPonto.tsx:26-71`), mas **nenhuma execução real**: sem botão "Sincronizar
agora", sem edge function associada, `ultima_sincronizacao` nunca é atualizado por
código algum. Token de autenticação gravado em texto puro e reexibido na edição
(`integracaoPontoService.ts:36-39`).

### Relatórios RH — `/rh/relatorios` (no menu) — **PARCIAL**

3 relatórios reais (dado de `colaboradores`, export CSV); 3 com botão "Em Breve"
`disabled` (Admissões/Demissões, Análise Salarial, Dashboard Executivo).

---

## Configurações

### Empresas / Usuários / Perfil / Centros de Custo / Campos Personalizados — **OK**

Todos com CRUD real e completo.

**Risco de segurança em Usuários:** o dropdown de role em "Resetar senha"
(`Usuarios.tsx:96-134`) permite promover qualquer usuário a `admin` — combinado com
o Bloco 1.5, é caminho de auto-escalação cross-tenant.

### Sistema — `/configuracoes/sistema` (no menu, oculto por flag) — **FACHADA TOTAL**

5 cards "Em breve", zero funcionalidade real. Rota acessível direto por URL mesmo
com a flag desligada — o gate só existe no menu (ver Bloco 2).

### Regras de Classificação de Receita — **sem rota nenhuma** — **ÓRFÃO**

`src/pages/configuracoes/RegrasClassificacaoReceita.tsx` — CRUD funcional completo
(`useRegrasClassificacao` + modal), mas **não está em `App.tsx` nem em
`sidebarConfig.ts`**. Trabalho pronto e inalcançável por qualquer caminho da UI.

### Relatórios (Ops) — `/configuracoes/relatorios-ops` (no menu, admin-only, lazy) — **OK**

Herda o gate ambíguo do Bloco 1.5.

### Webhooks — `/configuracoes/webhooks` (no menu) — **OK funcionalmente, mal protegido**

CRUD completo, rotação de secret HMAC, teste de assinatura. **Gap:** a rota é só
`ProtectedRoute`, não `AdminRoute` (`App.tsx:263`), apesar de gerenciar os secrets
que autenticam chamadas de satélites — qualquer usuário autenticado da empresa
acessa/rotaciona segredos, não só admin.

---

## Integração

### Sync Dashboard — `/integracao/sincronizacao` (no menu, oculto por flag + admin) — **OK como UI, dado vazando**

Dashboard bem construído (gráficos reais, retry via edge function
`retry-failed-syncs`). Ver Bloco 1.6: `sync_logs` sem escopo de tenant.

`src/services/syncService.ts` (HMAC v1/v2, `sendToExternalSystem`, `syncCliente`) é
**código morto** — zero chamadores em todo `src/`; duplica lógica que hoje só vive
nas edge functions (`process-webhook-outbox`, `sync-webhook`).

---

## Auth / Onboarding / Dashboard

### Login — `/login` (público) — **OK, robusto**

Turnstile, política de senha, senha temporária = e-mail no primeiro acesso. Nenhum
stub encontrado.

### Selecionar Empresa / Onboarding Cliente — fora do menu (correto) — **OK, com débito assumido**

`OnboardingCliente.tsx:22-26` tem `NOVUS_TENANT_EMPRESA_ID` hardcoded no
código-fonte, sem coluna/flag de banco — funciona, mas quebra silenciosamente se
esse tenant for recriado (risco já reconhecido em comentário do próprio código).

### Dashboard — `/` (no menu) — **OK, com 1 elemento decorativo falso**

4 métricas reais via `dashboardService` (bem cuidado contra "zero silencioso" — ver
`docs/STATUS.md`). **Card "Alertas Importantes" é 100% estático**: textos fixos
"Estoque Baixo"/"Contas Vencidas" nunca ligados a nenhum `useQuery` —
`Dashboard.tsx:106-113`.

### Rotas e páginas órfãs (varredura global)

- `src/pages/Index.tsx` — só faz `navigate('/', {replace:true})`, não referenciado
  em `App.tsx` nem em `main.tsx`. Resíduo do template original.
- `src/pages/NotFound.tsx` — sem rota; o 404 real é inline em `App.tsx:285`.
- `src/pages/configuracoes/Perfil.tsx` — rota existe mas não está em
  `sidebarConfig.ts`, alcançável só via avatar/`UserDropdown` — não é bug, mas não
  estava documentado como intencional.

---

# BLOCO 4 — Escala: 66 de 78 services sem paginação

Apenas **12 de 78** services usam `.range()`/`.limit()`. Todas as listas centrais
trazem a tabela inteira da empresa e filtram/ordenam no navegador:

`contasPagarQueries.ts:8-49` · `contasReceberQueries.ts:61-68` ·
`movimentacoesBancariasService.ts:71-176` · `fluxoCaixaService.ts:30-71` (duas cargas
completas por chamada) · `vendasService.ts:22-42` (e **duas vezes** em Relatórios de
Vendas quando "comparar período" está ativo) · `orcamentosService.ts:135-143` ·
`entidadeService.ts:142-163` · `produtoService.ts:15,31` · `contratosService.ts:6-23` ·
`servicoService.ts:32-40` · `relatoriosService.ts:186-193,230-236` (estoque) ·
`categoriaService.ts`, `localizacaoService.ts`, `tamanhoService.ts`,
`unidadeMedidaService.ts`, `clienteService.ts`, `fornecedorService.ts`.

Combinado com o Bloco 1.3 (331 policies reavaliadas por linha), este é o principal
obstáculo estrutural entre o ERP atual e o critério de saída da FIN-2 do roadmap.

**Padrão de referência já existente no repo:** `src/pages/estoque/kardex/index.tsx` +
`src/services/estoque/relatoriosService.ts:35-61` (limit/offset + "Mostrando X–Y de Z").

---

# BLOCO 5 — Autorização por rota quase inexistente

Só 4 das 85 rotas são gated: `/fiscal/dashboard`, `/configuracoes/relatorios-ops`,
`/configuracoes/campos-personalizados`, `/integracao/sincronizacao` (todas via
`AdminRoute`) — e essas 4 dependem do `checkHasRole(...,'admin')` do Bloco 1.5,
então o gate vale exatamente o que vale `has_role`.

Qualquer usuário logado com empresa ativa abre `/rh/folha/folha-pagamento`,
`/configuracoes/usuarios`, `/configuracoes/empresas` e **`/configuracoes/webhooks`**
— esta última gerencia e rotaciona os secrets HMAC que autenticam os satélites, e
está protegida apenas por `ProtectedRoute`.

A RLS ainda protege o dado no banco, mas a UI não reflete capacidade — exatamente o
risco "permissões financeiras decorativas" que o próprio `ROADMAP_2026.md` classifica
como crítico, hoje estendido a todo o resto do sistema.

---

# TOP 20 DEFEITOS (ordenados por gravidade)

1. **Isolamento multi-tenant quebrado em ~146 tabelas** — `has_role()` não filtra
   empresa; qualquer `admin` de uma empresa cliente lê/escreve dados de todas as
   empresas nas tabelas que usam esse padrão de policy (Bloco 1.5).
2. **Mesma causa raiz na borda de UI** — `AdminRoute`/`checkHasRole` herdam o bug;
   as 4 rotas "admin-only" do sistema não isolam por empresa (Bloco 1.5).
3. **Auto-escalação trivial** — `Usuarios.tsx:96-134` deixa qualquer admin promover
   qualquer usuário (inclusive a si mesmo) a `admin`, amplificando #1.
4. **`sync_logs` sem escopo de tenant** — vazamento cross-tenant de logs de
   sincronização (Bloco 1.6).
5. **Conciliação bancária inoperante em produção** — 5 tabelas com RLS habilitada e
   zero policies; o módulo mais bem escrito do sistema não funciona para o usuário
   final (Bloco 1.1).
6. **Upload de documento financeiro é simulado** — nada vai ao Storage; URL fake
   persistida como se fosse real (Financeiro → Movimentações).
7. **`FISCAL_MOCK` com default `true`** — sem o secret setado, toda emissão fiscal é
   simulada mas a UI mostra "autorizada" (Fiscal → Notas Fiscais).
8. **Folha de Pagamento sem motor de cálculo** — digitação manual de INSS/IRRF/FGTS,
   desconectada dos 3 catálogos que existem para alimentá-la (RH).
9. **Tributos (alíquotas): CRUD inteiramente decorativo** — nenhum botão funciona,
   nenhum backend de escrita existe (Fiscal → Tributos).
10. **Naturezas de Operação não salvam nada** — form sem `onSave`, service sem
    função de criar (Fiscal → Tributos).
11. **Registros de Ponto sem via de entrada** — tela lê uma tabela que o sistema
    nunca escreve (RH).
12. **Webhooks sem gate de admin** — qualquer usuário autenticado rotaciona secrets
    HMAC usados pelos satélites (Bloco 5).
13. **`ContasPagar.handleSubmit` fecha o modal antes da mutation terminar** — falha
    de gravação passa despercebida (Financeiro → Contas a Pagar).
14. **331 policies reavaliando `auth.uid()` por linha** — bloqueador estrutural de
    escala (Bloco 1.3).
15. **44 funções `SECURITY DEFINER` com EXECUTE para `anon`** — superfície de ataque
    desnecessariamente ampla (Bloco 1.4).
16. **Integração de Ponto configura e nunca executa** — sem job real, token em texto
    puro (RH).
17. **66 de 78 services sem paginação** — toda lista central carrega a empresa
    inteira no navegador (Bloco 4).
18. **`VendaPagamentoSection` e `RegrasClassificacaoReceita` órfãos** — trabalho
    completo, inalcançável pela UI.
19. **Botões mortos em Movimentações Bancárias** ("Editar" sem handler, "Visualizar"
    sem efeito) e filtro "Período" do Fluxo de Caixa sem efeito nenhum.
20. **Baixa de estoque de venda sempre na primeira localização** — `locais[0].id`
    em vez da escolhida pelo usuário; risco silencioso em empresa multi-depósito.

---

# Plano de execução

Ordenado por **risco de perda de dado / operação quebrada**, não por tamanho. Cada
fase deve deixar o sistema executável e fechar com `npm run typecheck` +
`npm run test -- --run` verdes.

## Fase 0 — Este documento
`AUDITORIA_NOVA.md` publicado; `SYSTEM_AUDIT.md` e `docs/AUDITORIA_*` de julho/2026
marcados como superados; `docs/ROADMAP_2026.md` e `docs/STATUS.md` a atualizar com
este topo de fila.

## Fase 1 — Ressuscitar o banco (CRÍTICO, ~1 sessão)
1. Confirmar ao vivo que a conciliação está mesmo vazia para um usuário
   `authenticated` (abrir `/gestao-bancaria/conciliacao` logado).
2. Migration nova (**aditiva**, `CREATE POLICY IF NOT EXISTS`) recriando as 14
   policies das 5 tabelas — copiadas de `20260713174159_*.sql`, validadas em
   `BEGIN…ROLLBACK` antes de aplicar.
3. Decidir e aplicar policy para `entidade_id_map` (hoje só service role — pode ser
   deny-all explícito e documentado).
4. Criar os buckets `fiscal-xml`, `fiscal-danfe`, `fiscal-certificados` com policies
   por empresa.
5. Retirar `EXECUTE` de `anon` das 44 funções `SECURITY DEFINER`; fixar
   `search_path` nas 4 funções apontadas.
6. Rodar `supabase db advisors` de novo e registrar o delta.
- **Verificação:** importar um extrato e conciliar uma linha ponta a ponta, com
  usuário real, no navegador.

## Fase 1.5 — Decisão sobre o alcance de `admin` (BLOQUEANTE, decisão de produto antes de codar)
Decidir se o `admin` de uma empresa cliente deve enxergar outras empresas. Hoje
enxerga, e é por desenho documentado — mas colide com o fluxo de auto-promoção em
`Usuarios.tsx`. Se a resposta for "não":
- Trocar `has_role(auth.uid(),'admin')` por `has_role_for_empresa(...)` nas ~146
  policies (a função correta **já existe no banco**), preservando `novus_owner` como
  papel global.
- Corrigir `checkHasRole` e `AdminRoute` na mesma direção.
- Tirar `admin` do dropdown de promoção em `Usuarios.tsx:96-134`, ou exigir
  `novus_owner`.
- Dar escopo de tenant a `sync_logs` (coluna + RLS + filtro nos hooks) ou restringir
  a rota.
- **Verificação:** estender `supabase/sql/fin0_isolamento_entre_empresas.sql` — que
  hoje exclui `admin` de propósito — com um cenário de admin de empresa A contra
  dados da B.

## Fase 2 — Fechar os buracos que perdem dado (~1 sessão)
- Upload real no Storage em `movimentacoesService.uploadDocumento` + ligar
  Visualizar/Download (signed URL) + deletar o arquivo junto da linha.
- `ContasPagar.handleSubmit`: usar `mutateAsync`/aguardar callback, espelhando
  `ContasReceber.tsx:52-67`.
- Naturezas de Operação: criar `createNaturezaOperacao`/`updateNaturezaOperacao` em
  `naturezaService`, ligar `onSave`, listar as naturezas reais, remover o `Dialog`
  duplicado.
- Tributos: CRUD real no `tributoService` + ligar os três botões.
- **Verificação:** subir arquivo, reabrir, baixar; criar natureza e tributo e
  conferir no banco; forçar erro no insert de conta a pagar e ver que o modal **não**
  fecha.

## Fase 3 — Matar as fachadas restantes (~meia sessão)
- Ligar "Editar"/"Visualizar" de Movimentações Bancárias (ou remover, se fora do
  escopo).
- Implementar `periodo_agrupamento` no Fluxo de Caixa (ou remover o filtro) e
  corrigir "Atualizar".
- Remover: aba "Extrato Avançado", texto de Debug em Rateios, `financeiro/bancos/*`,
  import morto de `EmBreve` + ícones, `NotFound.tsx`/`Index.tsx`, datas hardcoded do
  fluxo de caixa.
- Decidir sobre `VendaPagamentoSection` e `RegrasClassificacaoReceita`: conectar
  (rota+menu) ou apagar. Apagar `syncService.ts`.
- Ligar o card "Alertas Importantes" do Dashboard a dado real ou removê-lo.
- Trocar `window.location.reload()` por invalidação de query na conciliação.
- Avisar na UI que `gera_financeiro` só vale na criação do contrato; avaliar coluna
  `contrato_id` em `contas_receber`.
- Escolher localização na baixa de estoque da venda em vez de `locais[0]`.

## Fase 4 — Ligar o que está escondido (~meia sessão)
- Auditar ao vivo as telas de Estoque ocultas + Sistema + Sync.
- Limpar `Sistema.tsx` (5 cards "Em breve") e `RH → Relatórios` — entregar o que
  existe, remover o que não existe.
- Ligar `VITE_FEATURE_ESTOQUE_EXT` (e as demais conforme a auditoria confirmar) **e**
  passar as flags para as rotas em `App.tsx`, para a flag proteger e não só esconder.

## Fase 5 — Escala (~2 sessões, maior item do plano)
- Paginação server-side nas 6 listas de maior volume, no padrão do Kardex: Contas a
  Pagar, Contas a Receber, Movimentações Bancárias, Vendas, Entidades, Produtos.
- Converter as 331 policies para `(select auth.uid())` — migration mecânica, medir
  antes/depois.
- Agregar indicadores no Postgres em vez de somar no navegador (fluxo de caixa e
  relatórios).

## Fase 6 — Autorização de verdade (~1 sessão, depende da Fase 1.5)
- Gate por permissão nas rotas sensíveis: **`/configuracoes/webhooks` primeiro**
  (secrets HMAC hoje abertos a qualquer usuário), depois RH/folha, Configurações →
  Usuários/Empresas e Financeiro — reusando `AdminRoute`/`usePermissoes`.
- Esconder do menu o que o usuário não pode abrir.
- Guardar o `token_autenticacao` da integração de ponto fora de texto puro.

## Fase 6.5 — RH: decidir o que é o módulo (decisão de produto, não código)
RH hoje é cadastro + digitação manual, não folha. Três frentes independentes, cada
uma precisa de decisão antes de virar tarefa:
- **Folha**: motor de cálculo interno vs. parceiro homologado — decisão já adiada
  por este ciclo.
- **Registros de Ponto**: sem via de entrada. Definir a fonte (import CSV? relógio?
  API?) antes de qualquer código.
- **Integração de Ponto**: definir se vira job real ou se a tela sai do ar.
- Até haver decisão: marcar as três telas como não operacionais na UI, no padrão
  honesto que o SPED já usa, em vez de parecerem funcionais.

## Fase 7 — Higiene contínua (paralelo)
- Mover os 16 arquivos que chamam o client Supabase direto para `src/services/**`.
- Podar `console.*` (682) e `: any` (48) por área, mantendo os portões verdes.
- Cobrir com teste os services de dinheiro que ainda não têm (69 de 78 sem teste).
- Retomar a fila FIN-1 do `ROADMAP_2026.md` (renegociação de título, vincular
  movimentação bancária, E2E do ciclo completo).

## Ordem recomendada

Fase 0 → **1** → **1.5 (decisão)** → 2 → 3 → 4 → 6 → 5 → 6.5 (decisão) → 7.

Fase 5 (escala) fica depois da 6 de propósito: é a mais cara e nada nela é urgente
enquanto a base de dados real ainda é pequena. Fases 1, 1.5 e 2 são as únicas em que
**hoje** há módulo quebrado ou dado se perdendo.

## Fora do plano por decisão do usuário
- Ativação do provedor fiscal real (certificado A1, CSC, homologação,
  `FISCAL_MOCK=false`) — registrado aqui como risco de produção, mas fora do escopo
  de execução.
- Folha de pagamento: build interno vs. parceiro — permanece bloqueado; este
  documento só descreve o estado atual.

---

## Verificação global do plano

- `npm run typecheck` e `npm run test -- --run` verdes ao fim de cada fase.
- Toda migration provada em `BEGIN … ROLLBACK` contra o banco real antes de aplicar.
- `supabase db advisors` (security + performance) rodado antes e depois da Fase 1 e
  da Fase 5, com o delta registrado.
- Teste ao vivo no navegador para cada fase, com os dados temporários removidos ao
  final.
- Suíte E2E existente (`e2e/tests/01-06`) executada ao fim da Fase 2 — inclui
  `03-conciliacao.spec.ts`, o teste natural do Bloco 1.1.
