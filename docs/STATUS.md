# Status do projeto — NOVUS ERP

**Última atualização: 2026-08-10 (Cadastro Unificado de Entidades — Fase 2 completa nos 4 categorias, fix
no sync-webhook, 5 edge functions deployadas).**
Este arquivo deve ser atualizado ao final de cada sessão de trabalho relevante — se estiver desatualizado, ele
apodrece como `SYSTEM_AUDIT.md`/`ARVORE_PROJETO.md` já apodreceram. Leia primeiro [`../CLAUDE.md`](../CLAUDE.md)
para contexto de padrões estáveis; este arquivo é sobre o que está pendente **agora**.

## 🔖 Checkpoint de sessão (2026-08-10 — Cadastro Unificado de Entidades, Fase 1/8)

**Contexto**: refatoração grande, pedida pelo usuário no repo-mãe (`NovusSaaS`), pra substituir os cadastros
isolados de Cliente/Fornecedor/Colaborador/Sócio (sem dedup de CPF/CNPJ entre eles hoje) por um cadastro único
de Entidade com papéis. Plano completo em `C:\Users\maxwe\.claude\plans\tranquil-growing-zephyr.md` — corte seco,
sem piloto, 8 fases (4 ERP + 4 Educacional). Ver `novus-ai-educacional-54/docs/STATUS.md` mesma data pro lado
satélite.

**Decisões travadas** (não reabrir): tabela `entidades` por sistema (sem banco compartilhado); Educacional→ERP
é push-only (sem endpoint de leitura novo); corte seco (sem views de compatibilidade); regra de PF/PJ é por
papel (`papeis_catalogo.tipo_pessoa_permitido`), não hardcoded.

1. **Fase 0 (concluída)**: backup completo (schema+dados via `pg_dump` local — `supabase db dump --linked`
   exigia Docker, que não estava instalado; instalado via `winget install Docker.DockerDesktop` nesta sessão)
   dos dois projetos (ERP + Educacional) antes de qualquer DDL. Baseline de contagem registrado — **achado
   importante**: `clientes`/`fornecedores`/`colaboradores`/`socios_representantes`/`usuarios` estão **todos
   zerados** no ERP agora, o que reduz bastante o risco da Fase 2 (backfill não tem dado real pra migrar,
   só precisa funcionar corretamente pra dados futuros).
2. **Fase 1 (concluída, migration `20260810230000_create_entidades_schema.sql`)**: schema aditivo —
   `entidades` (forma canônica única, sem repetir o par de colunas dual que `clientes` tem hoje),
   `papeis_catalogo` (seed: CLIENTE/FORNECEDOR/PRESTADOR=`AMBOS`, COLABORADOR/SOCIO/REPRESENTANTE_LEGAL/
   PROCURADOR=`PF`), `entidade_papeis` (+ trigger `validar_papel_tipo_pessoa` — testado ao vivo, rejeita
   COLABORADOR numa entidade PJ e aceita CLIENTE numa PJ), `entidade_dados_colaborador` (extensão com FK real
   pra `cargos`/`departamentos`/`setores_empresa`), `entidade_id_map` (tabela de trabalho só da Fase 2, RLS sem
   policy de propósito — só `service_role` acessa). `usuarios` ganhou `entidade_id` + trigger
   `validar_usuario_pessoa_papel` (substituindo o `usuarios_pessoa_xor_chk` original por trigger, já que
   Postgres não aceita subquery em `CHECK`) — `colaborador_id`/`socio_id`/constraint antiga ficam intactos até
   a Fase 2 realinhar e dropar.
3. **Aplicado via `supabase db query --linked --file`** (não `db push` — histórico de migrations deste projeto
   está quebrado, workaround já documentado neste arquivo).

4. **Fase 2a (concluída, migration `20260810231500_backfill_cutover_socios_colaboradores.sql`)**: Sócios e
   Colaboradores migrados juntos — `usuarios_pessoa_xor_chk` acoplava os dois (mesma constraint, mesmo
   `NovoUsuarioModal`). Backfill `socios_representantes`/`colaboradores` → `entidades`+`entidade_papeis`
   (+`entidade_dados_colaborador`), preservando `id` original (achado do plano: evita reescrever FK
   dependente linha a linha). **Insight que reduziu bastante o escopo**: como o `id` é preservado, bastou
   retargetar as 4 constraints de FK (`folha_pagamento`, `beneficios_vinculados`, `registros_ponto`,
   `departamentos.responsavel_id`) de `colaboradores(id)` pra `entidades(id)` **mantendo o nome da coluna**
   (`colaborador_id`/`responsavel_id`) — zero mudança de código nesses 4 consumidores, só quem consultava
   `colaboradores`/`socios_representantes` **diretamente** precisou mudar: `colaboradorService.ts`,
   `sociosRepresentantesService.ts`, `usuarioService.ts` (3 funções: `listColaboradoresDisponiveis`,
   `fetchUsuariosComPessoa`, `checkDuplicidade`), `NovoUsuarioModal.tsx` (payload) e a edge function
   `colaborador-preflight` (Porta 3, chamada pelo Educacional). `ColaboradorFormModal.tsx` e as páginas de
   RH (`FolhaPagamento.tsx`/`BeneficiosVinculados.tsx`/`RegistrosPonto.tsx`) **não precisaram mudar** — já
   passavam pela camada de serviço com uma interface estável. `usuarios` perdeu `colaborador_id`/`socio_id`/
   `pessoa_tipo`/`usuarios_pessoa_xor_chk` (a trigger `validar_usuario_pessoa_papel` da Fase 1 assume a
   validação). Tabelas `colaboradores`/`socios_representantes` dropadas (corte seco, sem view de
   compatibilidade) — confirmado sem view dependente antes de dropar. Campo `socios_representantes.
   documento_url` não migrado pra `entidades` — grep confirmou zero uso real em qualquer form, só existia
   na declaração do tipo TS.
5. **Verificação**: `npm run typecheck` limpo, `npm run test -- --run` 361/361 (46 arquivos). `types.ts`
   regenerado do schema real (`supabase gen types typescript --linked`). Teste ao vivo via SQL (não só
   trigger, ponta a ponta: criar entidade+papel+dados_colaborador, replicar exatamente a query de
   `fetchColaboradores`/`colaborador-preflight`, `DELETE` e confirmar cascade limpou as 3 tabelas). Padrão
   `!inner` em embed do PostgREST já usado nesta base (`contaBancariaService.ts`), não é sintaxe nova.

6. **Fase 2b (concluída, migration `20260810233000_backfill_cutover_fornecedores.sql`)**: `fornecedores` →
   `entidades`+`entidade_papeis` (papel `FORNECEDOR`), mesmo padrão de preservar `id`. FKs de `contas_pagar`
   e `produto_fornecedores` retargeted mantendo nome de coluna. **Bug real encontrado e corrigido nesta
   fase, não introduzido por ela**: `fornecedorService.ts` (`transformToSupabaseFormat`) mandava dezenas de
   campos (`cnae`, `capital_social`, `anexos_pj`, `dados_bancarios` jsonb, `endereco` jsonb...) que a tabela
   `fornecedores` **nunca teve** — todo `INSERT`/`UPDATE` de fornecedor falhava com erro de coluna
   inexistente, o que bate exatamente com `fornecedores=0` linhas reais na produção (o cadastro nunca
   funcionou). Corrigido pra mapear só os campos reais de `entidades` — não só renomeado, consertado, já que
   estava quebrado de qualquer forma. Mesmo bug espelhado em `fornecedorUtils.transformSupabaseToFornecedor`
   (sentido de leitura) — corrigido junto, testes (`fornecedorService.test.ts`/`fornecedorUtils.test.ts`)
   reescritos pra validar o mapeamento real em vez do antigo (que testava a função contra si mesma, nunca
   contra o schema de verdade — por isso o bug nunca foi pego por teste). 6 pontos de embed do PostgREST
   (`fornecedor:fornecedores(...)`) em `useMovimentacoesFinanceiras.ts`/`contasPagarQueries.ts`/
   `contasPagarOperations.ts`/`fluxoCaixaService.ts` viraram `entidades!contas_pagar_fornecedor_id_fkey`
   com alias `fornecedores:`/`fornecedor:` preservado — evita tocar nos consumidores downstream que já
   esperavam essa chave na resposta. `OnboardingCliente.tsx` (cria fornecedor "NOVUS AI" pro double-entry
   de cobrança) também migrado.
7. **Verificação**: `npm run typecheck` limpo, `npm run test -- --run` 361/361. Teste ao vivo via SQL
   (criar entidade+papel Fornecedor, criar `contas_pagar` real apontando pra ela, confirmar join, cascade
   delete limpo).

8. **Fase 2c (concluída, migrations `20260810234500`/`20260810235000`/`20260810235500`)**: `clientes` →
   `entidades`+`entidade_papeis` (papel `CLIENTE`). Diferente de Fornecedores, `clientes` **não** era bug —
   tinha colunas jsonb/array reais e testadas (checkpoint 2026-08-09, "entrada testada de ponta a ponta").
   `entidades` ganhou extensão aditiva pra acomodar: `apelido`/`cnae`/`site`/`forma_atuacao`/
   `atividade_principal`/`setor_id` + jsonb (`contato_empresa`/`contatos`/`documentos`/`dados_pessoais`/
   `qualificacao_fiscal`) + o envelope de idempotência do contrato canônico (`origem_canal`/`origem_sistema`/
   `externo_id`/`idempotency_key`/`hash_payload` — existia em `clientes`, não capturado na 1ª extensão,
   corrigido numa 2ª migration aditiva). Backfill trata o schema duplo legado (`tipo`/`cpf_cnpj`/`endereco`
   jsonb) vs novo (`tipo_pessoa`/`cpf`/`cnpj`/endereço flat) com `COALESCE` priorizando o novo. FKs de
   `contas_receber`/`vendas`/`contratos`/`orcamentos_venda`/`cliente_politica_pagamento`/
   `cliente_modalidades_bloqueadas` **e** `centelha.responsaveis.cliente_billing_id` (schema separado)
   retargeted mantendo nome de coluna. `clienteService.ts` reescrito pra gravar/ler nas colunas reais de
   `entidades`, sintetizando o formato legado (`tipo` 'F'/'J', `cpf_cnpj`, `endereco` objeto) só na borda do
   `parseRow`, pra não precisar tocar em `clienteUtils.ts`/`FormCliente.tsx`. 8 pontos de embed PostgREST
   (`cliente:clientes(...)`) em `useMovimentacoesFinanceiras.ts`/`contasReceber*`/`contratosService.ts`/
   `fluxoCaixaService.ts`/`vendasService.ts`/`orcamentosService.ts` retargeted com alias preservado. 3
   consumidores diretos (`dashboardService.ts`/`fiscal/emissaoService.ts`/`syncService.ts`) retargeted —
   este último (`syncCliente`/`validateClienteSync`) é **código morto** (nunca chamado em lugar nenhum),
   corrigido só por estar no caminho, não por estar em uso.
9. **Fix urgente na integração viva com o satélite (mesma fase, não podia esperar Fase 3 formal)**:
   `supabase/functions/sync-webhook/index.ts` (`syncCliente`/`mapClienteData`/lookups de `syncVenda`/
   `syncContrato`/`syncFinanceiro`) e `supabase/functions/retry-failed-syncs/index.ts` (duplica a mesma
   lógica sem importar de um lugar comum — teve que ser corrigido em paralelo) ainda escreviam direto em
   `clientes`, que a Fase 2c acabou de dropar — sem esse fix, o próximo webhook do Educacional (Porta 1,
   `upsertClientByCPF`) quebraria com "relation clientes does not exist". Removido o hack de dual-write
   (colunas legadas `tipo`/`cpf_cnpj`/`endereco` jsonb) — `entidades` é forma canônica única, não precisa
   mais popular dois formatos. **Bugs pré-existentes achados e corrigidos nesse mesmo caminho**: `syncVenda`
   e o `mapClienteData` de `retry-failed-syncs` referenciavam colunas que **nunca existiram**
   (`external_id` — a coluna real sempre foi `externo_id`; `source_system`/`sync_metadata` como colunas
   soltas em `clientes`, nunca existiram) — significa que reprocessar um evento de cliente via retry, ou
   sincronizar venda por `cliente_id`, falhava silenciosamente antes desta sessão também. `fiscal-smoke-run`/
   `fiscal-emitir-nfe` (edge functions de teste/emissão fiscal) também retargeted. Dispatch continua aceitando
   `table:'clientes'` no payload de entrada (é só a chave do switch/schema Zod, não nome de tabela — Educacional
   não precisa mudar nada ainda) — a evolução pro payload rico de Entidade fica pra Fase 3 formal.
   **Edge functions não são cobertas por typecheck/test** (ponto cego documentado) — verificado via simulação
   SQL direta da lógica (dedup por CPF, upsert de papel, FKs), não via invocação real da function.
10. **Verificação final**: `npm run typecheck` limpo, `npm run test -- --run` 361/361 (46 arquivos, mesmo
    baseline do início da sessão). `types.ts` regenerado 3x (uma por migration aplicada). Smoke test SQL
    ponta a ponta (criar entidade+papel Cliente, dedup por CPF, `contas_receber`+`contratos` reais via FK,
    cascade limpo).

**Gap futuro anotado pelo usuário, não implementado nesta sessão**: comissionamento de vendedores —
`vendasService.ts` já tem `vendedor:usuarios(id,nome)`, mas não há nenhum cálculo/registro de comissão hoje.
Com `usuarios.entidade_id` (Fase 2a) o vendedor já resolve pra uma Entidade com papel `COLABORADOR` — uma
fatia futura de comissionamento poderia usar isso pra ligar % de comissão à entidade/papel, sem precisar de
cadastro de pessoa novo. Fica registrado aqui pra não se perder, não é escopo desta refatoração.

11. **Deploy feito** (confirmado com o usuário antes, via `AskUserQuestion`): `sync-webhook`,
    `retry-failed-syncs`, `fiscal-smoke-run`, `fiscal-emitir-nfe`, `colaborador-preflight` — as 5 edge
    functions tocadas nesta sessão, via `supabase functions deploy <nome> --project-ref reksodqzemboaeqxnxyy`.
    Todas com deploy bem-sucedido. Teste HTTP real de `sync-webhook` não foi possível/necessário — não há
    nenhuma linha em `webhook_configs` pra nenhuma empresa agora (a integração real não está configurada
    neste momento, provavelmente limpa junto com os outros dados de teste de sessões anteriores) — criar uma
    config só pra testar seria gerar dado de produção sem pedido. Verificação ficou em: simulação SQL da
    lógica exata (dedup por CPF, upsert de papel, FKs reais) + deploy sem erro.

12. **Fase 3 (concluída)**: `_shared/canonical/entities.ts` ganhou `entidadeCanonicalObjectSchema`/
    `entidadeCanonicalSchema` — mesmos campos de `entidades` + `papeis: array().min(1)`, com `superRefine`
    validando CPF/CNPJ (reusa `isValidCPF`/`isValidCNPJ`) e papel × `tipo_pessoa` (espelha o trigger do banco,
    validação client-side redundante de propósito). Registrado em `canonicalSchemas`/`canonicalObjectSchemas`
    sob a chave `entidades`, mantendo `clientes` intocado (janela expand-contract). `sync-webhook/index.ts`:
    `syncCliente`→`syncEntidade` (aceita `papeis` do payload, default `['CLIENTE']` quando chamado via
    `table:'clientes'` — satélite não migrado não quebra), `mapClienteData`→`mapEntidadeData`, novo
    `case 'entidades'` no dispatch ao lado do `case 'clientes'` existente. `ensurePapelCliente`→`ensurePapeis`
    (aceita lista, não só um papel fixo).
13. **Verificação real de edge function, incomum pra este repo**: `deno check`/`deno test` rodados via
    Docker (`denoland/deno:latest`) — algo que normalmente não é possível aqui (ponto cego documentado,
    edge functions não têm typecheck/test automatizado). 18/18 testes Deno passando em
    `entities.test.ts` (5 novos pro schema de Entidade, 13 preexistentes intactos). `deno check
    sync-webhook/index.ts` apontou 2 erros, ambos em `hmacSha256Hex`/`sha256Hex` — helpers de
    criptografia **não tocados nesta sessão**, incompatibilidade de tipo `Uint8Array`/`BufferSource`
    pré-existente da versão de lib do Deno CLI usada no teste local (o deploy real via
    `supabase functions deploy`, que já rodou com sucesso, usa outro pipeline e não acusa isso).
14. **Redeploy**: `sync-webhook` deployado de novo (mudou depois do primeiro deploy desta sessão).

**Próximo passo**: Fase 4 (UI `FormEntidade.tsx` consolidada no ERP, substitui os 3 forms separados) —
Educacional (Fases 5-8) ainda nem começou.

## 🔖 Checkpoint de sessão (2026-08-10 — responsividade mobile, aditiva)

**Contexto**: usuário pediu melhoria de acesso mobile (emergência, não
experiência principal) pro ERP e pro Educacional na mesma sessão — ver
`novus-ai-educacional-54/docs/STATUS.md` mesma data pro lado de lá.
Restrição dura: nada que arrisque quebrar/regredir o desktop.

Achado antes de mexer: a crença de que "o ERP já tá bem adaptado" só era
parcialmente verdadeira — formulários/diálogos/tabelas já respondiam bem
(`grid-cols-1 md:grid-cols-2`, `sm:max-w-[...]`, scroll horizontal nativo do
`<Table>`), mas o **shell principal não tinha nenhum caminho mobile**:
`AppSidebar.tsx` era uma única `<div>` fixa que só expandia no
`onMouseEnter` — em touch (sem hover) a navegação ficava permanentemente
travada em ícone-só, tecnicamente clicável mas ruim. Existia um sistema
`Sheet`/`useIsMobile` (shadcn padrão) já pronto em `src/components/ui/sidebar/`
mas nunca usado pelo shell real.

1. **`AppSidebar.tsx`**: ganhou ramo `isMobile` (via `useIsMobile()`, já
   existia, nunca fora usado) que renderiza `Sheet`/`SheetContent` com os
   mesmos itens (`SidebarMenuItem`/`SidebarMenuGroup`, reaproveitados —
   conteúdo extraído pra `renderNavItems()` compartilhado entre as duas
   variantes). Caminho desktop (`isHovered` fixed rail) **não foi tocado**,
   só passou a viver dentro de um `if`.
2. **`AppLayout.tsx`**: `ml-64`/`ml-16` ganharam prefixo `md:` (sem margem
   fora de `md` — a sidebar deixa de ocupar espaço em fluxo quando é
   `Sheet`/overlay). Novo estado `mobileMenuOpen` levantado, repassado pra
   `AppSidebar` e `AppHeader` (mesmo padrão já usado pra
   `sidebarExpanded`/`onExpandedChange`).
3. **`AppHeader.tsx`**: botão hamburger novo (`md:hidden`) à esquerda; bloco
   central "empresa ativa" (3º de 3 `flex-1`) escondido abaixo de `sm`
   (`hidden sm:flex`) — evita espremer tudo em ~375px, informação já visível
   em outros lugares do app.

**Não mexido, deliberado**: sistema completo `Sidebar`/`SidebarInset`
(`src/components/ui/sidebar/sidebar.tsx`) — outro modelo de largura/colapso
(CSS vars + `peer` selectors), migrar pra ele exigiria reescrever o desktop
também, risco alto pro que a sessão proibia mexer.

**Verificação**: `npm run typecheck`/`test` (361/361)/`build` limpos.
Testado ao vivo via Claude in Chrome com técnica de iframe injetado
(viewport 390×844 real) — desktop 1440px pixel-idêntico ao anterior
(hover-expand confirmado intocado), mobile: hamburger abre `Sheet` com
navegação completa, grupo expande, item de submenu navega e fecha o
`Sheet` sozinho, header não estoura, dialog de formulário (`FormCliente`,
"Novo Fornecedor") full-width coluna única — comportamento que já existia,
confirmado que não quebrou.

## 🔖 Checkpoint de sessão (2026-08-10 — vazamento de dado entre empresas fechado, leitura)

**Contexto**: continuação direta do achado registrado nos 2 checkpoints anteriores — usuário
descreveu o sintoma de forma bem concreta: mesmo sendo `novus_owner`, ao cair no dashboard de uma
empresa recém-criada (zero movimento), as telas mostravam soma/lista de **todas** as empresas que
a RLS libera pro `novus_owner`, não só a empresa ativa escolhida. Decisão explícita do usuário:
corrigir os dois grupos de função na mesma rodada — telas de listagem/dashboard (alta visibilidade)
e lookups por id (menor risco, mas ainda vazamento real).

**Fix mecânico em ~40 funções, 17 arquivos**, mesmo padrão em todos: `getEmpresaAtivaId()`/
`getEmpresaAtivaIdOuFalha()` (`src/lib/empresaAtiva.ts`, não mudou) resolve a empresa ativa, cada
query ganha `.eq('empresa_representada_id', empresaId)` — sempre encadeado depois de `.select(...)`
(nunca direto em `.from()`, Supabase-js não expõe filtro ali). Dois pontos onde 1 fix cobriu várias
funções: `aplicarFiltrosComuns` (`contasReceberQueries.ts`) e o equivalente em
`contasPagarQueries.ts` cobrem lista+estatísticas+busca-por-id de cada um; `AuditableServiceTemplate`
(`src/utils/auditableServiceTemplate.ts`) corrigido uma vez na classe genérica, cobre
`centros_custo` e qualquer service futuro que estenda o template.

**Arquivos tocados**: `dashboardService`, `contasReceber/contasReceberQueries`+`contasReceberService`,
`contasPagar/contasPagarQueries`+`contasPagarService`, `movimentacoesBancariasService` (5 funções),
`fluxoCaixaService` (4 funções, `getFluxoCompetencia` não tocado — já recebia `p_empresa_id`
explícito), `fiscal/fiscalDashboardService` (4 de 5 — `listAlertasFiscaisAtivos` não tem como
escopar, `report_ops_alerts` não tem coluna `empresa_representada_id`, é tabela global de alertas
operacionais, confirmado via schema antes de decidir não filtrar), `vendasService.list`,
`produtoService` (`listar`/`buscarPorId`/`buscarPorCodigoBarras`), `fornecedorService.
fetchFornecedores`, `colaboradorService.fetchColaboradores`, `usuarioService` (5 funções:
`fetchUsuariosComPessoa`/`fetchUsuariosAtivos`/`listColaboradoresDisponiveis`/`checkDuplicidade`/
`fetchNomeUsuarioAtual`), `clienteService.getEmpresaIdDoCliente`, `estoque/estoqueService` (4
funções), `contasPagar/contasPagarOperations`+`contasPagarPagamentos`, `fiscal/emissaoService.
getDanfeMockEnrichmentData`.

**Testes quebrados pelo fix, corrigidos no mesmo lote** (mocks desatualizados, não regressão de
lógica): `fornecedorService.test.ts`/`produtoService.test.ts` mockavam `supabase.from()` sem
`.eq()` no meio da cadeia e sem `rpc('get_user_empresa_id')` resolvendo — ajustado o shape do mock
pra bater com a cadeia real. `lote3d.test.ts` tinha um `rpcCalls` global nunca resetado entre
testes (`beforeEach` zerava `state` mas não o array de chamadas RPC) — passou a falhar porque
`checarSaldoParaSaida` (agora escopado por empresa) passou a chamar RPC onde antes não chamava,
poluindo a contagem que outro teste dependia estar zerada; corrigido resetando `rpcCalls.length = 0`
no `beforeEach`.

**Testado ao vivo no navegador** como `novusaisnp@gmail.com` (`novus_owner`): ALLEGRA mostra os
próprios números (8 clientes, R$1.160 em aberto, R$300.000 saldo bancário, 4 contas a receber com
nomes `[SEED]` reais da própria empresa) — sem regressão. Trocando pra "E2E TEST CO" (fixture de
teste automatizado, achada já existente via "Trocar empresa" → "Sem grupo", zero dado real além do
seed do próprio E2E) o dashboard vem **genuinamente zerado** (0 clientes, R$0,00 em tudo) e cada
tela checada (Contas a Receber, Fluxo de Caixa, Vendas, Fornecedores, Produtos — mostrando só
"E2E Produto Seed F4", Colaboradores) mostra vazio ou só o próprio dado do E2E, nunca dado da
ALLEGRA. Esse é exatamente o cenário que o usuário descreveu como quebrado — confirmado corrigido.

**Verificação**: `npm run typecheck` limpo, `npm run test -- --run` 361/361 (0 falhas) depois dos
ajustes de mock. Verificação ao vivo descrita acima. Usuário comum (`joao@tacto.com.br`, 1 empresa
fixa) não testado nesta rodada — o filtro novo é redundante mas inofensivo pra esse caso (RLS já
bastava sozinha), mesmo raciocínio já usado nas fatias anteriores desta feature.

**Gaps conscientes**: `fornecedorService.createFornecedor` não seta `empresa_representada_id` no
insert (achado de passagem, fora do escopo — este fix era só leitura); se algum dia esse insert
falhar silenciosamente por depender de trigger/default, é o primeiro lugar a olhar. Resto do
checklist de deploy do Centelha (edge functions, secrets, Exposed schemas) continua pendente, ver
checkpoints anteriores.

## 🔖 Checkpoint de sessão (2026-08-10 — seletor em cascata + faturamento espelhado NOVUS↔cliente)

**Contexto**: ajustes de UX/lógica sobre o wizard entregue no checkpoint anterior, pedidos em
sequência rápida pelo usuário testando ao vivo.

**Seletor em cascata**: `SelecionarEmpresa.tsx` reescrita — antes mostrava todos os grupos
expandidos de uma vez (`Collapsible`); agora é 2 passos de verdade — `Select` de Empresa
Responsável primeiro, só depois de escolher aparece a lista de Representadas daquele responsável
(`Select` → lista, com botão "Trocar responsável" pra voltar). Pula direto pro passo 2 se só
existe 1 responsável disponível; pula tudo (como já era) se só existe 1 representada no total.
Header ganhou o mesmo logo/marca "ERP + NOVUS.AI" do Login, e o overlay da marca d'água
(`login-hero`) foi de `bg-background/90` pra `/70` — usuário achou a versão anterior "quase
imperceptível", pediu ~20% mais visível.

**Faturamento: numeração + recorrência mínima + espelho contas a pagar**. Três pedidos
encadeados, todos escopados só ao wizard (usuário confirmou explicitamente não mexer no trigger
`gerar_titulo_inicial_contrato` nem no cron compartilhado — são infra já testada, usada por todo
o ERP):
1. **numero_documento sem UUID cru**: contrato criado pelo wizard agora recebe
   `numero_contrato = "NOVUS AI-<RESPONSAVEL>-<ANO>"` explícito — sem isso, o trigger cai no
   fallback `NEW.id::text` (UUID puro) pro `numero_documento`, achado ao revisar a tela real.
2. **12 parcelas mínimas na criação**: a 1ª (M1) já sai do trigger existente; o wizard completa
   M2-M12 direto em `contas_receber` (mesmo formato, mesma `origem_sistema`), em vez de depender
   só do cron diário `job_materializar_recorrencias` materializando 1 por mês.
3. **Espelho em contas_pagar do lado do cliente** (pedido do usuário, ponto de contabilidade
   correto: "se tem contas a receber num lado, tem que ter contas a pagar no outro"): cada
   parcela que a NOVUS vai **receber** também é criada como conta a **pagar** na representada
   principal do cliente (`representadasCriadas[0]`), com "NOVUS AI" criado como `fornecedor`
   daquela representada. `descricao` diferenciada por lado — no `contas_receber` da NOVUS
   identifica o **cliente** (`contrato.titulo`, ex. "Contrato — LIGNUM..."); no `contas_pagar` do
   cliente identifica **NOVUS AI** (`"NOVUS AI — Mensalidade (<numero_contrato>)"`), não repete o
   nome do próprio cliente. Confirmado ao vivo: `empresa_representada_id` do título de
   `contas_receber` aponta pra NOVUS AI de verdade (não pro cliente) — o que parecia dado
   misturado era só a tela de Contas a Receber não filtrando por empresa ativa (vazamento já
   registrado no checkpoint anterior), não um erro de gravação.
4. **Botão "usar mesmo CNPJ do responsável"** no passo 2 (sugestão do usuário) — copia nome+CNPJ
   do responsável pra 1ª representada, pro caso comum de empresa com 1 CNPJ só.

**Testado ao vivo, ponta a ponta, 2 clientes de teste novos**: "TESTE RECORRENCIA LTDA" (confirma
numeração + 12 parcelas) e "TESTE ESPELHO CONTAS PAGAR" (confirma o espelho contas_pagar +
fornecedor NOVUS AI, botão mesmo-CNPJ). Ambos com dados reais no banco, não limpos ainda — ver
gaps abaixo.

**Verificação**: `npm run typecheck && npm run test -- --run` limpos (361/361) depois de cada
rodada de ajuste. Queries diretas no banco confirmaram valores/datas/vínculos em todas as 4
mudanças.

**Dados de teste já limpos**: os 3 clientes de teste (LIGNUM, TESTE RECORRENCIA, TESTE ESPELHO
CONTAS PAGAR — responsável/representada/cliente/contrato/contas_receber/contas_pagar/fornecedor
de cada um) foram apagados do banco na mesma sessão, em ordem segura de FK. Só ALLEGRA (real) e
E2E TEST CO (fixture de teste automatizado, não tocar) permanecem além da própria NOVUS AI.

**Gaps conscientes**: `data_competencia`/`natureza_id`/`plano_conta_id` de `contas_pagar` não
preenchidos pelo espelho (fora do mínimo necessário, mesma lógica de "wizard cobre o básico, resto
se ajusta depois na tela normal"). Resto dos gaps do checkpoint anterior (vazamento entre
empresas, deploy das edge functions) continua igual, não tocado nesta rodada.

## 🔖 Checkpoint de sessão (2026-08-10 — wizard de onboarding pela UI + achado de vazamento entre empresas)

**Contexto**: usuário apontou que a fatia anterior (hierarquia + seletor) resolveu o bug, mas
deixou a criação de cliente novo como operação manual via Supabase Studio — risco operacional
real (senha exposta, sem trilha de auditoria) pra uma tarefa rotineira. Pediu UI própria.

**Construído**: wizard de 5 passos (`src/pages/auth/OnboardingCliente.tsx`, rota
`/selecionar-empresa/nova`), só visível pra `novus_owner` (botão "+ Nova empresa" em
`SelecionarEmpresa.tsx`, condicionado a nova RPC `is_novus_owner()`). Cobre responsável (novo ou
existente) → representada(s) (múltiplas filiais) → contrato → satélite opcional → revisão/salvar,
tudo em chamadas sequenciais do client (não transação atômica — trade-off deliberado, ver plano).
Duas funções novas além de `is_novus_owner`: `criar_responsavel_centelha` e
`listar_satelites_disponiveis` (mesma ponte `SECURITY DEFINER` que o resto do Centelha usa pra
atravessar o isolamento do schema). Resto reaproveita serviços já existentes sem mudança de
schema — `empresasRepresentadasService`/`clienteService`/`contratosService` — só ganharam o campo
`responsavel_id` onde fazia falta. Busca de CNPJ via BrasilAPI (mesmo padrão de
`EmpresasRepresentadasList.tsx`) autopreenche o nome ao sair do campo.

**Visual**: fundo com a mesma imagem do login (`login-hero`) como marca d'água nas telas de
seletor/onboarding, a pedido do usuário — consistência visual do fluxo de autenticação.

**Testado ao vivo, ponta a ponta, com dado real**: criado cliente "LIGNUM COMERCIO E EXPORTACOES
LTDA" (CNPJ real, autopreenchido pela BrasilAPI) — confirmado no banco: `centelha.responsaveis` +
`empresas_representadas` (linkados) + `public.clientes` + `public.contratos` (R$500/mês) +
`contas_receber` **gerado sozinho pelo trigger já existente** (`gerar_titulo_inicial_contrato`,
zero código novo pra isso) — recorrente, mensal, `PENDENTE`, vencimento correto. Redirecionou
sozinho pro dashboard da empresa recém-criada ao final.

**Achado importante, fora do escopo desta fatia — registrado, não corrigido**: ao revisar o
resultado no navegador, a tela de Contas a Receber misturava títulos de mais de uma empresa
(ALLEGRA + LIGNUM juntos) pro usuário `novus_owner`. Causa: `src/services/contasReceber/
contasReceberQueries.ts` (`aplicarFiltrosComuns`) monta a query **sem nenhum `.eq('empresa_representada_id', ...)`**
— depende 100% da RLS pra escopar. Pra usuário normal (1 empresa fixa) isso sempre funcionou por
acidente; pra `novus_owner` (RLS libera tudo, fix da sessão anterior) as telas que nunca filtraram
explícito por empresa agora misturam dado de empresas diferentes. Grep confirmou o mesmo padrão
(`.from(tabela)` sem filtro de empresa) em outros **15 arquivos de serviço**: `vendasService`,
`contasPagarQueries`/`contasPagarOperations`/`contasPagarPagamentos`, `movimentacoesBancariasService`,
`produtoService`, `fornecedorService`, `fluxoCaixaService`, `fiscal/emissaoService`,
`fiscal/fiscalDashboardService`, `estoque/estoqueService`, `auditableCentroCustoService`,
`colaboradorService`, `usuarioService`. **Não é dado mockado, é vazamento real de leitura (e
provavelmente escrita) entre empresas** — mais sério que o Dashboard (que já tinha o mesmo problema
nos KPIs, achado antes). Usuário decidiu explicitamente: registrar agora, planejar correção numa
sessão dedicada — 15+ arquivos é grande demais pra decidir a abordagem (filtro por arquivo? um
wrapper de query central? travar `novus_owner` de telas operacionais?) no meio de outra entrega.

**Verificação**: `npm run typecheck && npm run test -- --run` limpos (361/361). Teste completo ao
vivo no navegador (login, wizard, dashboard, confirmação no banco) descrito acima.

**Gaps conscientes**: vazamento entre empresas nas telas operacionais (ver achado acima) — maior
pendência real do ecossistema agora, recomendo ser o próximo trabalho. `clientes.cnpj` fica `null`
ao criar via wizard (só grava `cpf_cnpj`, coluna legada) — mesmo dual-schema já documentado, não é
bug novo. Satélite do wizard (`centelha-provisiona-cliente`) não testado ao vivo — depende do
deploy da edge function, ainda pendente. Atomicidade do wizard (sequencial, não transação) — ver
trade-off no plano desta sessão.

## 🔖 Checkpoint de sessão (2026-08-10 — hierarquia Responsável → Representada + seletor de empresa)

**Contexto**: continuação direta do checkpoint anterior (mesma data). Testar o `novus_owner` de
verdade revelou que ele quebrava a maior parte do ERP — ~23 arquivos duplicavam uma função
`getEmpresaIdAtual()`/`getEmpresaId()` que lança exceção sempre que `get_user_empresa_id()`
retorna `NULL` (o caso de um usuário sem empresa fixa nunca tinha existido antes). Usuário pediu
mais que um fix pontual: uma hierarquia de verdade, `NOVUS.AI → Empresa Responsável (cliente
pagante) → Empresa Representada (CNPJ operacional)`, com seletor obrigatório quando há mais de
uma representada disponível.

**Schema novo**: `centelha.responsaveis` (não reaproveitou `public.clientes` — herda o isolamento
do resto do Centelha, e evita colidir com `empresa_responsavel`, tabela singleton já existente
que significa outra coisa: branding "Empresa Principal"). `centelha.licencas.cliente_id` renomeado
pra `responsavel_id` e reapontado pra `centelha.responsaveis` (antes apontava pra
`public.clientes`, corrigido antes de qualquer licença real existir — 0 linhas confirmado antes).
`public.empresas_representadas.responsavel_id` novo, nullable (representadas sem grupo, como
"E2E TEST CO", continuam funcionando). RPC `public.get_empresas_disponiveis()`
(`SECURITY DEFINER`) faz a ponte de leitura pra usuário comum, mesmo padrão de
`get_user_empresa_id()`/`has_role_for_empresa`.

**App layer**: `src/lib/empresaAtiva.ts` novo — fonte única de "empresa ativa" (RPC, com fallback
pro `localStorage` quando o usuário não tem empresa fixa). Os 23 arquivos que duplicavam a lógica
(4 variantes diferentes, achadas por Explore agent — nunca eram só as ~15 que a sessão anterior
tinha achado) foram refatorados pra importar dessa fonte única, matando a duplicação de vez em
vez de só contornar o sintoma. Nova tela `src/pages/auth/SelecionarEmpresa.tsx` (agrupada por
responsável, seções colapsáveis) + `src/components/auth/EmpresaGate.tsx` (gate de rota, mesmo
espírito do `ProtectedRoute` mas cuidando só de "sabe pra qual empresa está olhando?") +
`UserDropdown` ganhou item "Trocar empresa".

**Regressão real achada e corrigida em teste ao vivo no navegador** (não em revisão estática):
`has_role()` fazia match exato de role — ao trocar `novusaisnp@gmail.com` de `admin`/ALLEGRA pra
`novus_owner`/global (checkpoint anterior), a conta perdeu o `admin` literal que ~146 tabelas fora
do Centelha ainda checam direto (`has_role(uid,'admin')`, sem o escopo `has_role_for_empresa` que
só cobre `clientes`/`contratos`/`contas_receber`). Sintoma: header não lia
`empresas_representadas` (nome/logo da empresa sumia), Saldo Bancário mostrava R$0,00 mesmo tendo
saldo real. Fix na raiz, migration `20260810170000_has_role_novus_owner_implies_all.sql`:
`has_role()` passa a considerar `novus_owner` como implicando qualquer role — as ~146 policies
não precisaram ser tocadas, só a função. Confirmado ao vivo: header voltou a mostrar a logo da
ALLEGRA, Saldo Bancário passou a mostrar R$300.000,00 reais.

**`centelha-provisiona-cliente` ajustada** pro novo contrato: recebe `representada_id` (não mais
`cliente_id`), resolve `responsavel_id` a partir da representada, grava licença com o nome de
coluna novo.

**Backfill real rodado** (não ficou pendente): `empresas_representadas` "NOVUS AI" criada
(cnpj ainda `NULL` — dado real que só o usuário pode fornecer, não fabricado);
`public.clientes` de cobrança da ALLEGRA sob o tenant NOVUS; `centelha.responsaveis` da ALLEGRA
ligado a esse cliente de cobrança; `empresas_representadas.responsavel_id` da ALLEGRA setado.
`get_empresas_disponiveis()` testado direto no banco e no navegador: retorna ALLEGRA (agrupada) +
E2E TEST CO + NOVUS AI (ambas "sem grupo").

**Verificação**: `npm run typecheck && npm run test -- --run` limpos (361/361, 2 asserts de
`produtoService.test.ts` atualizados pra bater com a mensagem de erro compartilhada nova — mudança
de comportamento esperada, não regressão). Testado ao vivo no Chrome como `novusaisnp@gmail.com`:
login → seletor mostra os 2 grupos corretos → escolhe ALLEGRA → dashboard carrega dado real →
Clientes lista os 8 registros `[SEED]` da ALLEGRA sem erro (tela que antes travava) → "Trocar
empresa" no menu do usuário volta pro seletor.

**Gaps conscientes**: CNPJ da `empresas_representadas` "NOVUS AI" ainda `NULL` — preencher com o
CNPJ real da NOVUS quando disponível. Persistência da escolha é só `localStorage` (por
dispositivo/navegador, não sincroniza) — decisão deliberada desta sessão, servidor fica pra depois
se precisar. Resto do checklist de deploy do Centelha (edge functions, secrets, Exposed schemas)
continua pendente, ver checkpoint anterior.

## 🔖 Checkpoint de sessão (2026-08-10 — migrations Centelha deployadas + usuários reorganizados)

**Contexto**: continuação da sessão que construiu a fatia 1 do Centelha (código pronto, migrations
ainda não aplicadas). Usuário pediu pra arrumar a bagunça de usuários que já existia nos dois
bancos antes de seguir — dono da marca (`novusaisnp@gmail.com`) estava cadastrado como se fosse
colaborador/admin da própria ALLEGRA (o cliente real), e 2 contas soltas no ERP sem vínculo
nenhum. Investigação direta nos dois bancos via `supabase db query` (não é suposição de código).

**As 3 migrations Centelha da sessão anterior foram aplicadas em produção** (`centelha_schema`,
`add_novus_owner_role`, `has_role_scoped_novus_tables`) — **não via `supabase db push`**: o
histórico de migrations do CLI está bem mais incompleto do que os arquivos locais (projeto
nasceu no Lovable, boa parte do schema real nunca foi tracked via CLI), `db push` pedia
`--include-all` pra reaplicar 70+ migrations antigas contra produção viva — risco alto demais,
não é o que foi pedido. Aplicado o SQL de cada arquivo novo diretamente via `db query`, na ordem
certa (schema → enum `novus_owner` em transação própria, já que Postgres não deixa usar um valor
de enum novo na mesma transação em que foi criado → função + policies). Dois bugs pequenos
achados só na hora de rodar (não apareciam em revisão estática): `'novus_owner'` e o `NULL` do
backfill de `user_roles` precisavam de cast explícito (`::app_role`, `::uuid`) — sem isso,
`INSERT ... SELECT` com literal solto infere `text`, não bate com a coluna. Arquivo
`20260810120200_has_role_scoped_novus_tables.sql` corrigido no repo pra bater com o que rodou.

**Achado operacional que quase causou erro real**: `supabase link --project-ref X` grava o ref
em `<cwd>/supabase/.temp/project-ref` — **relativo ao diretório atual**, não é estado global do
CLI. Rodar `link` a partir do diretório errado troca silenciosamente qual projeto um `db query
--linked` alcança depois. Aconteceu 2x nesta sessão (uma tentativa de aplicar o schema `centelha`
foi pro banco do Educacional por engano — falhou alto com erro de FK ausente, sem aplicar nada,
sem dano). Regra daqui pra frente: **sempre `cd` pro diretório do projeto certo antes de
`supabase link`**, nunca linkar "de qualquer lugar".

**Reorganização de usuários (ERP)**:
- `novusaisnp@gmail.com` deixou de ser `colaborador`/`usuario`/`admin` escopado à ALLEGRA — vira
  `user_roles.role='novus_owner'` (`empresa_representada_id=NULL`, acesso global) +
  `centelha.owners`. Confirmado por teste funcional de RLS que ele continua enxergando `clientes`
  de qualquer empresa (ALLEGRA e E2E TEST CO) através da nova `has_role_for_empresa`.
- `joao@tacto.com.br` e `mara.d_o@hotmail.com` (contas que já existiam soltas, sem nenhum vínculo)
  ganharam `user_roles.role='admin'` escopado à ALLEGRA. Não ganharam registro em
  `usuarios`/`colaboradores` — exigiria CPF/nome real que não foi fornecido; regra de nunca
  fabricar dado de identidade (`CLAUDE.md` raiz) se aplica aqui também.
- "E2E TEST CO" (`empresas_representadas`) confirmado como fixture viva de
  `e2e/fixtures/db-reset.ts`/`e2e-reset` — não é lixo, não foi tocado.
- Dados `[SEED]`/teste manual dentro da ALLEGRA (6 colaboradores, 8 clientes, mais o resto das 16
  tabelas mencionadas na sessão que os criou) — **adiado a pedido do usuário**, fica pra depois.

**Reorganização de usuários (Educacional, `novus-ai-educacional-54`)**: só existia 1 usuário no
banco inteiro, mas 4 `organizations` — nomes enganavam. A chamada "Allegra Centro Educacional"
(`0f07e009-...`) estava **vazia**; quem tinha dado real (guardians, students, enrollments,
documents, audit_logs, `erp_integration_config` já corretamente apontado pra ALLEGRA de
verdade) era uma organização mal-nomeada "NOVUS.AI - Escola Teste" (`68860f6a-...`). Migrado
tudo (17 tabelas com linha real, um por um `UPDATE organization_id`) para o id correto
(`0f07e009-...`), as outras 3 organizations apagadas. `novusaisnp@gmail.com` ficou sem
`profiles` no Educacional — coerente com o modelo Centelha (dono da marca não é admin de
organização de cliente nenhuma). `erp_integration_config`/`financial_transactions` não têm FK
formal pra `organizations` (só `organization_id uuid`, sem `REFERENCES`) — não cascadeiam
sozinhos, precisou de `DELETE` explícito antes de apagar as organizations.

**Verificação**: `user_roles` final conferido por query direta; `usuarios`/`colaboradores` do
dono confirmados removidos (`count=0`); `centelha.owners` populado; RLS testado de verdade via
`SET LOCAL role=authenticated + request.jwt.claims` simulando o `user_id` do dono — leu
`clientes` de mais de uma empresa, confirmando `novus_owner` funcionando. Lado Educacional:
`organizations` com 1 linha só, `profiles` do dono vazio.

**Gaps conscientes**: dados `[SEED]` da ALLEGRA no ERP continuam lá (adiado, ver acima). Contas
`joao@tacto.com.br`/`mara.d_o@hotmail.com` têm acesso admin completo à ALLEGRA sem registro de
colaborador — se precisarem passar pelo gate `colaborador-preflight` do lado satélite algum dia,
falta CPF/nome real. Restante do checklist de deploy do Centelha (Dashboard "Exposed schemas"
incluir `centelha`, seed de `empresas_representadas`/`centelha.satelites` pra NOVUS AI e
Educacional, secrets `CENTELHA_PROVISION_SECRET`/`ERP_BASE_URL`, deploy das 2 edge functions
novas) continua pendente — ver checkpoint anterior.

## 🔖 Checkpoint de sessão (2026-08-10 — NovusAI Centelha fatia 1: licença + provisionamento)

**Contexto**: usuário quer um controle central de clientes/licenças da marca NOVUS (nome: Centelha),
gerenciando quais clientes usam quais ferramentas (ERP, Educacional, e satélites futuros: PDV, Clínica,
Mercado...) e como o primeiro admin de cada cliente entra no sistema. Plano completo em
`~/.claude/plans/estive-pensando-muito-sobre-sleepy-zephyr.md`. Investigação confirmou que o motor de
cobrança comercial (`contratos`/`contas_receber` + trigger de recorrência) já existia pronto — não foi
reconstruído, só reaproveitado com a NOVUS como uma `empresa_representada` normal deste mesmo ERP.

**Construído nesta sessão (código completo, ver §Pendências pra produção funcionar de verdade)**:
1. **Schema `centelha` isolado** (`20260810120000_centelha_schema.sql`): tabelas `owners`/`satelites`/
   `licencas`, `REVOKE ALL ... FROM PUBLIC` explícito (Postgres dá USAGE a PUBLIC por padrão em schema
   novo — sem o revoke o isolamento não vale nada), RLS habilitado sem nenhuma policy (nega tudo a
   `authenticated`/`anon`), só `service_role` tem grant. `supabase/config.toml` ganhou `[api] schemas`
   incluindo `centelha` — **isso só vale pro CLI local; no projeto hospedado, o Dashboard (Settings > API
   > Exposed schemas) precisa ser atualizado manualmente pra bater**, senão as próprias edge functions não
   conseguem `.schema('centelha').from(...)`.
2. **`has_role` escopado, só em 3 tabelas** (`20260810120100_add_novus_owner_role.sql` +
   `20260810120200_has_role_scoped_novus_tables.sql`): `has_role(uid,'admin')` ignora
   `empresa_representada_id` em ~158 policies do schema inteiro (padrão intencional — um operador só
   gerencia várias empresas representadas). Isso vira um vazamento real só nas 3 tabelas que passam a
   hospedar dado comercial da própria NOVUS (`clientes`/`contratos`/`contas_receber`) — corrigido só
   nelas via nova função `has_role_for_empresa` + role `novus_owner` (migra automaticamente quem hoje é
   admin global). **As outras ~146 policies continuam exatamente como estavam, decisão deliberada, não
   esquecimento** — não confundir com bug se reaparecer em auditoria futura.
3. **Porta 0 — Provisionamento** (nova, documentada em `docs/CONTRATOS_CANONICOS_ERP.md` §2): direção
   inversa das 3 portas existentes (NOVUS → satélite, não satélite → NOVUS). Edge function
   `centelha-provisiona-cliente` (ERP, exige `has_role(uid,'novus_owner')`) busca o satélite alvo em
   `centelha.satelites` por `codigo` e chama `centelha-provisiona-organizacao` no satélite (HMAC, segredo
   por-satélite, não por-empresa). Genérico de propósito — satélite futuro (PDV/Clínica/Mercado) só
   precisa implementar esse endpoint + 1 linha em `centelha.satelites`, zero mudança do lado ERP.
4. **Lado Educacional implementado** (`supabase/functions/centelha-provisiona-organizacao`): recebe o
   provisionamento, cria `organizations` + `erp_integration_config` (já resolvendo
   `empresa_representada_id` vindo do ERP) + convida o admin por `inviteUserByEmail` + `profiles`.
   Autentica por segredo global (`CENTELHA_PROVISION_SECRET`), não por config por-organização — essa
   ainda não existe nesse ponto, é este endpoint quem a cria. Mesmo padrão assimétrico que já existia
   entre outbound (`erp_integration_config`, por-org) e inbound (`edu-erp-webhook`, env var global).
5. **Signup aberto fechado (Educacional)**: `onboarding-create-org` (deixava qualquer signup criar
   organização e virar admin sozinho, sem convite nem verificação) deletado, junto com
   `src/pages/app/onboarding.tsx` e a rota `/app/onboarding`. Dashboard com `orgId` nulo agora mostra
   "aguarde convite do administrador" em vez de botão de autocriação. `register.tsx` (signup de conta,
   sem org) continua aberto de propósito — inofensivo, usuário só cai no estado vazio acima.

**Pendências pra produção funcionar de verdade (nada disso é código, é operação manual)**:
- Aplicar as 2 migrations novas no projeto `reksodqzemboaeqxnxyy` (`supabase db push` ou equivalente).
- Atualizar "Exposed schemas" no Dashboard do projeto (incluir `centelha`) — `config.toml` não propaga
  isso sozinho pra projeto hospedado.
- Seed manual: seu `user_id` em `centelha.owners`; conferir que a migration te moveu pra `novus_owner`
  (`SELECT * FROM user_roles WHERE role='novus_owner'`); `INSERT empresas_representadas` pra NOVUS AI;
  `INSERT centelha.satelites` pro Educacional (`codigo='educacional'`, `base_url` real, secret gerado).
- Configurar `CENTELHA_PROVISION_SECRET` (mesmo valor do `provisioning_secret` acima) e `ERP_BASE_URL`
  como secrets da function no projeto `ixnpotaccbpcbritxlud` (`supabase secrets set`).
- Deploy manual das 2 novas edge functions nos dois projetos (`supabase functions deploy
  centelha-provisiona-cliente` / `centelha-provisiona-organizacao`) — nenhuma delas sobe sozinha no
  `git push`, mesmo ponto cego já documentado pro resto do repo.
- Teste ponta a ponta ainda não rodado contra produção (só typecheck/test local, que não cobre edge
  functions — ver Verificação abaixo).

**Fora de escopo desta fatia, deliberado**: tela de gestão do Centelha (operação por SQL/Studio +
chamada direta à function por enquanto); contrato automático via landing page; suspender licença
bloqueando acesso de fato no satélite (hoje `licencas.status` é só registro, nenhum satélite consulta
antes de logar — preflight de licença é fatia futura, mesmo padrão de `colaborador-preflight`).

**Verificação**: `npm run typecheck && npm run test -- --run` no ERP (361/361 passando) e `bun run
typecheck && bun run test` no Educacional (47/47 passando) — ambos limpos. Edge functions novas
(`centelha-provisiona-cliente`, `centelha-provisiona-organizacao`) não cobertas por nenhum dos dois,
mesmo ponto cego de sempre — revisadas manualmente, não testadas ao vivo ainda.

## 🔖 Checkpoint de sessão (2026-08-09 — 3 gaps de conector ERP↔satélite fechados)

**Contexto**: pergunta do usuário no repo-mãe ("que falta pra efetivar a integração do satélite com o ERP?")
disparou 3 agentes Explore puxando os dois lados de cada conector (payload que o satélite manda vs. o que o
ERP espera) em vez de responder de memória — achou 3 gaps reais confirmados por leitura direta de código, não
só de `STATUS.md`. Plano completo em `~/.claude/plans/parallel-baking-narwhal.md`.

1. **Cliente invisível na tela do próprio ERP — corrigido**: `mapClienteData` (`sync-webhook/index.ts`) só
   escrevia colunas novas (`tipo_pessoa`/`cpf`/`cnpj`); a UI real do ERP (`clienteService.ts`/`FormCliente.tsx`)
   lê colunas legadas (`tipo`/`cpf_cnpj`/`endereco`/`apelido`, restauradas pela migration
   `20260725150000_restore_clientes_legacy_fields.sql`). Cliente criado via satélite existia no banco mas
   aparecia em branco pro time financeiro. Corrigido: `mapClienteData` virou `async`, agora escreve os dois
   conjuntos de coluna — `tipo`/`cpf_cnpj` sempre (deriváveis do payload atual), `apelido`/`data_nascimento`/
   `endereco` só quando o payload realmente traz o dado (spread condicional — um update parcial, ex. só
   e-mail, não pode apagar endereço que um humano digitou na tela do ERP).
2. **Conector de Contrato — instalado, `gera_financeiro:false`**: ERP já tinha receptor pronto (`syncContrato`
   + trigger `gerar_titulo_inicial_contrato`, corrigidos em sessão anterior) mas o satélite nunca chamava —
   só mandava a 1ª mensalidade avulsa via `createReceivable`. Restrição já decidida antes: mandar Contrato com
   `gera_financeiro:true` JUNTO com o avulso recorrente duplicaria a cobrança (o trigger geraria um 2º título).
   Satélite agora manda o Contrato com `gera_financeiro:false` — fica visível/consultável na tela de Contratos
   do ERP (registro documental/jurídico), cobrança continua 100% pelo avulso recorrente já funcionando. Migrar
   a cobrança em si pro Contrato formal é decisão maior, não entrou nesta fatia.
3. **Envelope de idempotência (Fase 1b parcial) em `clientes`/`contratos` — instalado**: `contas_receber` já
   tinha `origem_canal`/`origem_sistema`/`externo_id`/`idempotency_key`/`hash_payload`; `clientes`/`contratos`
   não tinham nenhuma. Achado mais sério durante a investigação: `syncContrato` fazia **insert incondicional**
   no branch `insert`/`sync`, sem nenhum lookup de existência (diferente de `syncCliente`, que já dedupa por
   cpf/cnpj) — todo retry de webhook criava uma linha duplicada de Contrato e redisparava o trigger de título.
   Migration nova (`20260809234500_clientes_contratos_idempotency_envelope.sql`) adiciona o envelope nas duas
   tabelas + índice único parcial em `contratos(empresa_representada_id, idempotency_key)` (fecha condição de
   corrida que só o lookup em código não fecha). `syncContrato` ganhou lookup-antes-de-insert: replay (mesmo
   `hash_payload`) retorna o existente sem duplicar; payload divergente lança `CONFLITO_PAYLOAD_DIVERGENTE`
   (mesmo padrão já usado em `converter_orcamento_em_venda`) em vez de sobrescrever silenciosamente.
4. **Deploy manual de `sync-webhook`** feito (`supabase functions deploy sync-webhook`, confirmado pelo
   usuário antes — ação de produção, bloqueada por padrão pelo classificador de auto mode).
5. **Verificação ao vivo, ponta a ponta, contra tenant real (ALLEGRA)**: POST assinado real (HMAC do
   `webhook_configs` da ALLEGRA) — cliente de teste sincronizado com `tipo='F'`/`cpf_cnpj` populados junto com
   `tipo_pessoa`/`cpf` (Fix 1 confirmado); Contrato de teste inserido 2x com payload idêntico → 2ª chamada
   retornou `replay:true`/HTTP 200 (não 201), `SELECT count(*)`=1 confirmado (Fix 3 confirmado); mesmo
   `numero_contrato` com `valor_mensal` diferente → HTTP 500 `CONFLITO_PAYLOAD_DIVERGENTE`, contagem
   continuou 1 (nenhuma sobrescrita); `contas_receber` com `gera_financeiro:false` → 0 títulos gerados (Fix 2
   confirmado, sem duplicar cobrança). Dados de teste removidos ao final, `remaining=0` confirmado nos dois
   lados (`clientes`/`contratos`).
6. **Skill `~/.claude/skills/erp-satellite-integration/SKILL.md` atualizada** (pedido explícito do usuário,
   meta final desta sessão): seção "Bugs confirmados" (que dizia `syncContrato`/`syncFinanceiro` quebrados)
   estava apodrecida — todos os 3 bugs citados já tinham sido corrigidos numa sessão anterior e a skill nunca
   foi atualizada. Reescrita com o estado real + 4 padrões novos consolidados: dual-schema gotcha em tabelas
   com coluna legada restaurada, registro de Contrato sem duplicar cobrança (`gera_financeiro:false`),
   envelope de idempotência (idempotency_key explícito + lookup-antes-de-insert), `colaborador-preflight` como
   modelo de referência pra qualquer Porta 3 nova via HTTP (RPCs internas do ERP não são alcançáveis
   cross-projeto por um satélite).

**Verificação**: `npm run typecheck`/`npm run test -- --run` (361/361)/`npm run build` limpos (edge functions
fora da cobertura, ponto cego documentado — `npx eslint` rodado manualmente no arquivo alterado, limpo).

**Gaps conscientes**: `upsertClient`/`createReceivable` (chamadas já existentes antes desta sessão) continuam
sem teste automatizado, só exercitadas via UI real — fora do escopo desta fatia. Fase 2 (adaptador genérico
por satélite) e envelope completo em `produtos`/`estoque_movimentacoes`/`liquidacoes_titulos` (Fase 1b restante)
continuam não iniciados — ver `docs/ROADMAP_2026.md`.

## 🔖 Checkpoint de sessão (2026-08-09 — Porta 1 funcional + recorrência automática + Contrato formal)

**Contexto**: sessão começada no repo-mãe (`NovusSaaS`) pedindo pra conectar ERP↔Educacional de verdade
(satélite=PDV, responsável=cliente, mensalidade=título). Trabalho cross-repo, commits nos dois lados
(`novusai-erp` + `novus-ai-educacional-54`) — ver `docs/STATUS.md` do satélite pro lado dele.

1. **Porta 1 (`sync-webhook/index.ts`) estava 100% quebrada pra `clientes` e `contas_receber` de verdade**,
   não só "faltando recorrente/periodicidade" como a doc antiga dizia — `syncFinanceiro`/`syncCliente`
   gravavam/buscavam em colunas que não existem no schema atual (`situacao`→`status`, `valor_pago`→
   `valor_recebido`, `contrato_id` inexistente, `cpf_cnpj`/`external_id`/`tipo`/`endereco` inexistentes em
   `clientes` — schema real usa `cpf`/`cnpj`/`tipo_pessoa` separados) e nunca preenchiam `descricao` (NOT
   NULL). Reescrito pros nomes reais, `.single()`→`.maybeSingle()` nos lookups. Testado com POST assinado
   real contra o tenant ALLEGRA (cliente + título criados corretos, apagados depois).
2. **Mensalidade recorrente automática, ligada de verdade**: `materializar_recorrencias`/`job-recorrencias`
   já existiam e já funcionavam, mas (a) nenhum cron chamava a RPC (confirmado em `cron.job` antes do fix —
   só 2 jobs, nenhum de recorrência; agendado `job_materializar_recorrencias`, 1x/dia) e (b) `syncFinanceiro`
   nunca mapeava `total_parcelas` (`DEFAULT 1` no banco travava qualquer recorrência na 1ª parcela; agora
   grava `NULL` = sem fim definido, a menos que o satélite mande um valor). Testado ao vivo: título avulso
   recorrente → `materializar_recorrencias(30)` chamada manual gerou a parcela 2 com `origem_recorrencia_id`
   certo.
3. **`syncContrato` corrigido** (mesma classe de bug do item 1): `titulo` (NOT NULL) nunca era setado — todo
   insert falhava sempre —, `status` minúsculo nunca batia no CHECK (maiúsculo), campos
   `servicos`/`responsavel`/`source_system`/`sync_metadata` não existem na tabela real. **Novo**: trigger
   `gerar_titulo_inicial_contrato` (`AFTER INSERT ON contratos`) faz `gera_financeiro` (campo mudo desde
   sempre) realmente criar o 1º título recorrente — dali o cron do item 2 cuida do resto. Testado ao vivo
   ponta a ponta: Contrato com `gera_financeiro=true` → trigger gerou título inicial respeitando
   `dia_vencimento`/`valor_mensal` → `materializar_recorrencias` gerou a parcela 2 dele também.
4. **Escopo consciente**: o satélite (`novus-ai-educacional-54`) não foi alterado nesta rodada — continua só
   com título avulso recorrente (que passa a funcionar sozinho com o fix do item 2), não emite Contrato
   ainda. Emitir os dois ao mesmo tempo (avulso recorrente + Contrato com `gera_financeiro`) duplicaria a
   cobrança do mesmo aluno — decisão deliberada, não esquecimento.
5. **Pendência nova, achada de passagem, não corrigida**: `mapClienteData` (item 1) grava só as colunas
   "novas" de `clientes` (`tipo_pessoa`/`cpf`/`cnpj`/campos de endereço separados). A UI real do ERP
   (`clienteService.ts`, ativa, consome `FormCliente.tsx`) lê/grava as colunas "legadas" restauradas pela
   migração `20260725150000_restore_clientes_legacy_fields.sql` (`tipo`, `cpf_cnpj` combinado, `endereco`
   jsonb, `apelido`) — as duas coexistem no banco (achado tardio, não documentado até agora). Um cliente
   criado via satélite (Porta 1) fica com as colunas novas certas mas aparece com `tipo`/`cpf_cnpj`/
   `endereço` em branco na tela de Clientes do próprio ERP. Não bloqueia nada (dado não se perde, só não
   aparece na UI legada) — se for atacar depois, `mapClienteData` precisa popular os dois conjuntos de
   coluna, mesmo padrão do bug já resolvido em `fornecedorService.ts` (item 5 do checkpoint anterior, ainda
   não corrigido também).
6. **Fix de segurança relacionado, do lado do satélite**: RLS de `profiles` no Educacional permitia
   auto-escalação de role/organização (sem `WITH CHECK` efetivo) — corrigido lá, não neste repo, mas
   documentado aqui porque foi achado no meio deste trabalho cross-repo. Ver checkpoint do satélite.

**Verificação**: `npm run typecheck` 0 erros, `npm run test -- --run` 361/361. Deploy de `sync-webhook`
feito 3x ao longo da sessão (cada rodada de fix). Migration nova aplicada via `supabase db query --file`
direto (não testado `supabase db push` nesta sessão pra este repo — sem necessidade, só 1 migration nova).

## 🔖 Checkpoint de sessão (2026-08-09 — sync de migrações + fix real do Clientes + seed de teste)

**Contexto**: sessão começou pedindo dados de teste (empresa escola = ALLEGRA, já cadastrada) pra testar o
ERP fim a fim. Ao rodar o seed, apareceu erro `Could not find the 'sigla' column of 'bancos'` — investigando,
achado que **o banco `reksodqzemboaeqxnxyy` (migrado de `lrkebsznehpuascgqbri` em 08/08) estava ~40 migrações
atrasado**: tudo criado a partir de `20260713155404` nunca tinha sido registrado como aplicado
(`supabase migration list --linked` mostrava `remote: ""` pra todas). O trabalho cresceu de "popular dados" pra
"sincronizar o banco de verdade", com aprovação do usuário a cada descoberta nova.

1. **Migrações aplicadas via `supabase db push --linked --include-all`**, uma por uma, com problemas reais
   encontrados e corrigidos no caminho (não são bugs desta sessão, só nunca tinham sido pegos porque o banco
   nunca tinha rodado essas migrações antes):
   - 2 migrações de seed de dados de teste de uma empresa antiga (`LIGNUM`, projeto anterior) —
     marcadas como aplicadas (`supabase migration repair --status applied`), não fazem sentido pro projeto novo.
   - Várias tabelas (`estoque_movimentacoes`, `estoque_inventarios`, `estoque_inventario_itens`,
     `estoque_saldos`, `fiscal_configuracoes` e afins, `banco_extratos_importados`,
     `porta3_autorizacoes_excecao`) **já existiam no banco mas sem RLS/policies/triggers/funções** — a tabela
     tinha sido criada por fora do fluxo de migração rastreado, então `CREATE TABLE` batia em "already exists"
     e abortava a migração inteira antes de chegar nas partes que faltavam. Corrigido rodando manualmente só o
     restante de cada migração (grants/RLS/policies/triggers/funções) via `supabase db query -f`.
   - **Achado recorrente sério**: `estoque_movimentacoes`, `estoque_inventarios`, `estoque_inventario_itens`,
     `estoque_saldos`, `porta3_autorizacoes_excecao` e `banco_movimentacoes_extrato` foram criadas **sem
     PRIMARY KEY** (mesmo tendo `id uuid PRIMARY KEY` na definição da migração) — bloqueava qualquer FK ou
     `ON CONFLICT` apontando pra elas. Todas vazias, corrigido com `ALTER TABLE ... ADD PRIMARY KEY (id)` antes
     de rodar o resto. Como isso aconteceu não foi investigado (hipótese: criação manual via dashboard que não
     copiou a constraint) — se aparecer de novo em tabela nova, é o mesmo padrão.
   - `entidade_dependencias` (helper de "não pode excluir X, tem Y vinculado") tinha o mesmo problema de PK
     ausente na chave composta — corrigido, `check_dependencias()`/`regenerar_entidade_dependencias()` agora
     funcionam.
   - Módulo de Estoque (RPCs `validar_saldo_estoque`, `baixar_estoque_venda`, `estornar_estoque_venda`,
     `conciliar_inventario`) e Porta 3 (`verificar_autorizacao_venda`, `autorizar_excecao_venda`,
     `has_permissao`) **não existiam de jeito nenhum** — as tabelas existiam (criadas por fora), mas as
     funções nunca tinham rodado. Recriadas manualmente a partir do conteúdo das migrações originais.
   - Conciliação bancária (`sugerir_matches_extrato`, `confirmar_match`, `desfazer_conciliacao`,
     `reverter_extrato`, `criar_lancamento_do_extrato`) — mesma causa (PK faltando em
     `banco_movimentacoes_extrato` bloqueava a FK `movimentacoes_bancarias.movimentacao_extrato_id`).
     Todas essas 5 funções são stub (`NOT_IMPLEMENTED_P15_1`), então "existir" aqui só quer dizer que a UI
     não quebra mais tentando chamar uma RPC inexistente — a lógica real de matching ainda não foi implementada.
2. **Bug real achado e corrigido** (não é da sessão, só nunca tinha sido pego porque a tabela `clientes`
   nunca tinha sido usada de verdade neste projeto): `clienteService.ts` gravava/lia colunas (`tipo`,
   `cpf_cnpj`, `endereco`, `qualificacao_fiscal`, `emails`, `telefones`, `contatos`, `documentos`,
   `dados_pessoais`, `contato_empresa`) que tinham sido restauradas como jsonb/array nativo pela migração
   `20260725150000_restore_clientes_legacy_fields.sql` (que também nunca tinha rodado até esta sessão), mas
   o service continuava fazendo `JSON.stringify`/`JSON.parse` manual como se fossem `text` puro — quebrava
   com `malformed array literal` ao tentar criar qualquer cliente com email/telefone pela UI real
   (`FormCliente.tsx`, tela ativa, não código morto). Corrigido: `emails`/`telefones` viram array JS nativo,
   os campos jsonb (`endereco`, `contatos`, etc.) vão sem stringify. Testado ao vivo criando um cliente PF
   pela UI real — funcionou, removido depois. `src/services/clienteService.test.ts` tinha um teste que
   validava o comportamento antigo (esperava `JSON.parse` funcionando em cima de um array já stringificado
   errado) — corrigido pra checar o valor nativo direto.
3. **`src/integrations/supabase/types.ts` regenerado do banco real** (`supabase gen types typescript
   --linked`) duas vezes ao longo da sessão, à medida que o schema foi sendo corrigido — estava desatualizado
   há tempo (tinha colunas em `bancos`/`contas_bancarias`/`clientes` que nunca existiram na versão atual do
   schema). Isso também destravou 7 erros de typecheck pré-existentes em `dependenciasService.ts`,
   `estoqueService.ts` e `porta3Service.ts` que chamavam RPCs não reconhecidas pelo tipo `Database`.
4. **Seed de dados de teste pra ALLEGRA CENTRO DE EDUCACAO LTDA** (`b3de8e2a-5919-475f-a55c-a92f04358eb3`,
   primeiro caso real do ecossistema): 16 tabelas povoadas (plano de contas, centros de custo, departamentos,
   cargos, localização de estoque, banco + conta bancária, categorias de produto, colaboradores, clientes
   PF+PJ, fornecedores, produtos, vendas em 3 status + itens, contas a receber, liquidações, folha de
   pagamento). Todo registro leva prefixo `[SEED] ` em nome/descrição — convenção de rastreabilidade pra
   achar e limpar depois, sem depender de coluna `observacoes` (nem toda tabela tem). Script usado
   (`scripts/seed-*.mjs`, service role key) foi de uso único, apagado ao final — não é ferramenta permanente.
5. **`fornecedorService.ts` continua dessincronizado do schema real** (mesmo padrão do bug de `clientes`,
   achado de passagem, **não corrigido nesta sessão** — fora do escopo que foi pedido). Ver
   `docs/CONTRATOS_CANONICOS_ERP.md`/histórico desta sessão se for atacar depois: colunas reais são
   `tipo_pessoa`/`cpf`/`cnpj` separados, `nome`/`empresa_representada_id` nunca são enviados pelo service
   apesar de `NOT NULL` no banco.

**Verificação**: `npm run typecheck` 0 erros, `npm run test -- --run` 361/361, testado ao vivo no navegador
(criar cliente PF real pela tela de Cadastros).

## 🚀 Checkpoint de sessão (2026-08-09 — Visual refactor final + PWA + Lovable cleanup)

**Branch `visual-refactor` mergeada em `main`.** 4 commits finais, upados para `origin/main`.

1. **Recuperação + melhoria de animação intro**:
   - Nova imagem de background login (NOVUS.ai com circuito eletrônico), 70% da tela
   - Formulário reduzido para 30% (proporção 30/70)
   - Animação intro: `object-contain` (sem cortes) + degradê radial nas bordas suavizando

2. **PWA (Progressive Web App)**:
   - `vite-plugin-pwa` + `workbox` instalados
   - Manifest automático com app metadata (nome, descrição, ícones, theme-color)
   - Service worker gerado, cache offline, precache de 34 assets
   - 6 ícones PWA em tamanhos (16x16, 32x32, 192x192, 512x512, maskable versions)
   - Meta tags PWA completas no `index.html`
   - Cache inteligente: API (NetworkFirst), imagens (CacheFirst 30d)

3. **Remoção total de Lovable**:
   - `lovable-tagger` dependency removida de `package.json` e `vite.config.ts`
   - Imagens migradas: `lovable-uploads/*` → `/public/novus-logo*.png`
   - Componentes atualizados: Login, AppHeader, BrandFooter
   - PWA cache limpo de referências lovable-uploads
   - Projeto 100% independente, nenhum vínculo restante

**Build**: `✓ built in 23.80s`, PWA precache `11561.87 KiB`, 34 entries.
**Vercel**: Deploy automático ativado em webhook (main branch).
**Tests**: typecheck 0 erros, test suite passando.

## 🔖 Checkpoint de sessão (2026-08-09 — reforma visual restyle-only + logo por empresa representada)

**Branch `visual-refactor`** (não mergeada em `main` ainda), 6 commits, pushada pra `origin`.
Ponto de partida foi o doc `.claude/refatoracao_visual` (skill fornecida pelo usuário) — validado
contra o código real (2 claims corrigidos: não havia bug de ícone de lixeira no Saldo Bancário, e a
sidebar não usava tokens de tema como o doc assumia, ao contrário, tinha cor hardcoded `#1e3a8a`/
`bg-blue-600` bypassando `--sidebar-*` que já existia). Escopo cresceu ao longo da sessão a pedido do
usuário: começou como restyle das telas citadas no doc, terminou cobrindo praticamente 100% do
sistema.

1. **Tokens novos** (`src/index.css`/`tailwind.config.ts`, aditivos): `--accent-vivid` (ciano da
   logo), `--status-draft/confirmed/production/delivered/cancelled`, `--card` off-white,
   `--radius` 0.5→0.375rem, `boxShadow.elevated`. Grupo `erp` (hardcoded, zero uso real) deletado.
2. **Sidebar reescrita** para consumir `--sidebar-*` (existia, não era usada) em vez de hex/blue
   hardcoded; barra de 3px `accent-vivid` no item ativo.
3. **Foco de 16 primitivos `ui/`** (Input/Select/Checkbox/Switch/Button/Tabs/Dialog/Toast/Badge...)
   movido de `ring-ring` (navy) pra `accent-vivid` — cobre 100% dos formulários do sistema sem
   precisar tocar tela por tela (maior alavanca de "escopo 100%" pedida pelo usuário).
4. **Varredura de ~85 arquivos** com cor de status hardcoded (4 agentes em paralelo, escopo restrito
   a className/cor, zero lógica) — migrados pros tokens `--status-*`. Paletas categóricas legítimas
   (tipo de imposto, tipo de arquivo, PF/PJ) e cores sem token equivalente (roxo, teal, cyan-chart)
   foram deixadas de propósito, listadas nos relatórios dos agentes, não é trabalho esquecido.
5. **Splash de vídeo no login** (`src/components/IntroSplash.tsx` + `public/intro.mp4`): 1x por
   sessão (`sessionStorage`), muted+autoplay+playsInline, timeout de segurança de 4.8s, clique pra
   pular, respeita `prefers-reduced-motion`.
6. **Logo por empresa representada no header** (não por `empresa_responsavel` — usuário corrigiu
   explicitamente: cenário multiloja, cada CNPJ tem sua própria logo):
   - `src/hooks/useEmpresaRepresentadaAtual.ts` (novo): resolve a empresa via `get_user_empresa_id()`;
     se o usuário é admin sem vínculo (RPC retorna null) E só existe 1 empresa representada ativa,
     usa ela sem ambiguidade — resolve o caso mono-loja/admin-dono-único sem quebrar multiloja real
     (com >1 empresa, admin continua sem "empresa atual" determinável, cai no fallback de texto).
   - `src/lib/normalizeLogoImage.ts` (novo): normalizador de imagem via Canvas nativo (sem
     dependência nova) — contain-fit centralizado em canvas 512×512 transparente, nunca estica/
     distorce, aplicado no upload já existente em `EmpresasRepresentadasList.tsx`.
   - **Bug real achado e corrigido**: header/PDFs/relatórios cada um com query de cache separada
     pra logo, sem invalidação cruzada no save — trocar a logo só refletia em todo lugar depois do
     `staleTime` expirar ou reload manual. `useEmpresasRepresentadas.ts` agora invalida
     `empresa-representada-atual`/`empresa-logo-url`/`empresas-logos-map` junto no `onSuccess` do
     save. Confirmado via rede que o save dispara refetch automático sem reload.
   - Removido campo/conceito de logo de `empresa_responsavel` (form, hook, service) — só
     `empresa_representada` tem logo agora. Coluna `logo_url` no banco não foi migrada/dropada, só
     parou de ser escrita (decisão consciente, sem `DROP`/`RENAME`).
   - Logo do header ajustada pro tamanho máximo da barra (`h-16`, toca topo/base do header de 64px).
7. **Testado ao vivo no navegador** (Claude em Chrome) em cada etapa: sidebar hover/rota ativa,
   toggle PF/PJ, Dashboard KPIs, upload de logo real (arquivo corrompido → rejeitado limpo sem
   sujar dado; arquivo válido → normaliza, salva, invalida cache, aparece no header).

**Pendente, fora de escopo desta sessão (decisão consciente, não esquecimento):**
- **Satélite Educacional** (`novus-ai-educacional-54`, repo/projeto Supabase separado) também
  consome/exibe logo em seus próprios documentos — usuário pediu, mas não dá pra mexer às cegas
  num repo não aberto nesta sessão. Precisa de sessão própria lá; o padrão a replicar é o mesmo
  (path + signed URL resolvida na hora, nunca cópia estática).
- ~65 arquivos com cor hardcoded não-status (decorativo, gráfico, categórico) deliberadamente fora
  do escopo da varredura — ver relatórios dos 4 agentes na conversa da sessão se precisar retomar.
- `console.log` de debug em `AppSidebar.tsx`/`AppLayout.tsx` (pré-existentes, não desta sessão) —
  fácil follow-up, não é visual.
- Merge de `visual-refactor` → `main` não feito ainda, aguardando revisão/aprovação do usuário.

`npm run typecheck`: 0 erros. `npm run test -- --run`: 357/357. `npm run build`: passa (warnings de
chunk size pré-existentes, não desta sessão).

## 🔖 Checkpoint de sessão (2026-08-09 — reprovisão pós-migração + Porta 3 colaborador, feito a partir do satélite educacional)

**Contexto**: sessão começou no repo `novus-ai-educacional-54` (cadastro de professor/equipe), mas
achou que a migração do ERP pra este projeto (`reksodqzemboaeqxnxyy`, concluída 2026-08-08 por fora
desta sessão) tinha **deixado o banco migrado mas nenhuma Edge Function deployada** — `supabase
functions list` retornava vazio. Trabalho feito aqui, do lado ERP, veio como consequência disso.

1. **3 Edge Functions deployadas** (nenhuma existia neste projeto antes de hoje):
   - `sync-webhook` (já existia no código, só nunca tinha sido deployada pro projeto novo).
   - `get-empresa-logo` (**nova, não existia em lugar nenhum** — o satélite educacional já
     chamava esse endpoint desde antes, mas ele nunca tinha sido construído; sempre caiu em
     silêncio no fallback local). Resolve `empresas_representadas.configuracoes->>'logo_path'`
     + `storage.createSignedUrl` (bucket `empresa-logos` é **privado**, não público como um
     comentário antigo no código do satélite assumia).
   - `colaborador-preflight` (**nova**): Porta 3 — `{cpf, empresa_representada_id}` assinado
     (HMAC V1, mesmo esquema de `sync-webhook`) → `{autorizado, bloqueios[]}` no formato
     canônico (`_shared/canonical/preflight.ts`). Verifica se a pessoa é um `colaboradores`
     ativo (`ativo=true AND deleted_at IS NULL AND (data_demissao IS NULL OR futura)`).
     **Desenhado genérico de propósito** (usuário pediu explicitamente): identifica só por
     CPF+empresa, nada específico de satélite educacional — qualquer satélite futuro (PDV,
     frente de caixa, CRM) reusa sem alteração. Todas as 3 deployadas com `--no-verify-jwt`
     (satélites chamam sem JWT Supabase, só HMAC).
2. **`webhook_configs` reprovisionado pra ALLEGRA CENTRO DE EDUCACAO LTDA** (`empresa_representada_id
   b3de8e2a-5919-475f-a55c-a92f04358eb3`, primeiro case real do ecossistema, cadastrada nesta sessão
   com logo já carregada em `empresa-logos`): linha nova `nome='novus-educacional'`, secret gerado
   (32 bytes hex), `ativo=true`. Satélite reconfigurado em espelho (`erp_integration_config`,
   ver `docs/STATUS.md` do satélite) com `mock=false` — **integração real ligada pela primeira vez**.
3. **Bug real achado, sem código**: `client.ts` do satélite nunca mandava o header `x-empresa-id`
   que `sync-webhook` exige — mascarado pelo `mock=true` histórico, nunca tinha rodado de verdade
   contra este endpoint. Corrigido do lado satélite (não deste repo).
4. **Bug reportado pelo usuário, não investigado nesta sessão**: formulário de cadastro de
   colaborador na UI do ERP **trava ao salvar** (pisca, não persiste, sem erro visível) — usuário
   tentou se cadastrar como colaborador de teste e não conseguiu. Bloqueou testar o caminho feliz
   do gate de colaborador via UI real; contornado inserindo colaborador de teste via SQL direto
   (removido ao final). **Precisa de investigação própria numa sessão futura** — não sei se é bug
   de validação client-side, RLS, ou outra coisa; não teve tempo de abrir o DevTools desta sessão.
5. **Verificação**: `colaborador-preflight` testado via `curl` com HMAC real calculado (openssl) —
   3 cenários (autorizado, CPF não encontrado, assinatura inválida) todos corretos. `get-empresa-logo`
   testado ao vivo, retornou signed URL real. Dado de teste (colaborador fake, secret de teste)
   limpo ao final — a linha real de `webhook_configs`/config do satélite **fica**, é produção.

**Gaps conscientes**:
- Bug do formulário de colaborador (item 4) — não corrigido, não investigado a fundo.
- `upsertClient`/`createReceivable` (satélite→ERP, já existiam) nunca foram testados de verdade
  contra este projeto novo — só a reprovisão básica + o endpoint novo de colaborador foram
  validados. Podem ter os mesmos bugs de header que `sync-webhook` tinha.
- Esquema de assinatura usado no endpoint novo é só V1 (sem replay-guard) — decisão consciente,
  V2 não foi julgado necessário pra uma consulta idempotente.

## 🔖 Checkpoint de sessão (2026-07-27, fim do dia — leia isto primeiro)

**Estado: tudo sincronizado, nada pendente de commit/push.** Commit `c3983cb` (vendedor/operador
na venda + limpeza de código morto do fluxo legado de Usuários) pushado para `origin/main`.
Migração `20260727130000` confirmada aplicada no Supabase live (`supabase migration list
--linked`, local=remote). `npm run typecheck`: 0 erros. `npm run test -- --run`: 357/357.
Próxima sessão pode continuar direto do backlog abaixo, sem precisar decidir sobre commit primeiro.

**Decisões em aberto, ambas apresentadas ao usuário e respondidas com "por enquanto não"/aguardando:**
1. **56 erros `@typescript-eslint/no-explicit-any` em 16 arquivos** (achado 2026-07-27, engano da
   sessão anterior que alegou "0 em todo o repo" — ver seção "Saúde técnica" abaixo). Usuário disse
   "por enquanto não" quando perguntado se atacava agora — **não iniciar sem perguntar de novo**.
2. **Backlog restante da avaliação de mercado de Vendas** (ver seção própria abaixo): itens (a)
   desconto percentual, (c) venda rápida/balcão, (d) KPIs na lista, (e) filtros avançados, (f)
   origem/canal_venda — nenhum escolhido ainda pelo usuário. Item (b) vendedor/operador foi
   concluído nesta sessão.

**Regra nova do usuário (2026-07-27), vale para toda sessão futura:** sempre que aparecer código
órfão/lixo/achado irrelevante durante qualquer tarefa, limpar na hora — exceto se puder servir
para integrações futuras (ver [[feedback_cleanup_dead_code]] na memória, e o exemplo real desta
sessão: `useAuditableEntity.ts` foi mantido por ser template documentado, o resto foi deletado).

## ✅ Limpeza de código morto — fluxo legado de Usuários (2026-07-27)

Achado de passagem enquanto investigava um jeito de listar usuários pro Select de vendedor (ver
seção abaixo): `usuarioService.fetchUsuarios()` fazia `.order('nome_completo')`, coluna que não
existe mais em `usuarios` desde a reconstrução da tabela (agora é `nome`) — um bug real de schema
drift, mas em **código morto**: confirmado por grep que a tela real `/configuracoes/usuarios` já
usa `fetchUsuariosComPessoa()` (colunas corretas) desde antes desta sessão, e a cadeia antiga
(`useUsuarios.ts` → `UsuarioFormModal.tsx` → `FormUsuario.tsx`/`FormVinculoColaborador.tsx`/
`FormPerfil.tsx`/`UsuarioCard.tsx`, chamada a partir de `UsuariosVinculadosList.tsx`) não tinha
nenhum importador alcançável — o próprio código já tinha uma nota do autor original admitindo isso
("não é referenciado por nenhuma tela real hoje — o fluxo vivo é NovoUsuarioModal").

Por pedido explícito do usuário (regra geral, não só este caso: sempre limpar achados de lixo/
código órfão quando encontrados, a menos que sirva para integrações futuras), **deletado**: os 9
arquivos acima, mais `usuarioService.fetchUsuarios()`/`SupabaseUsuario`/`createUsuario`/
`updateUsuario`/`deleteUsuario` (só chamados pela cadeia morta) e o tipo `Usuario` órfão em
`types/empresa.ts`. Verificado antes de apagar (grep completo da cadeia de imports, sem chamador
vivo) e depois (typecheck 0 erros, 357/357 testes, mesma contagem de testes de antes — nenhum
teste dependia desse código). Contra-exemplo mantido de propósito:
`useAuditableEntity.ts`/`useAuditableCentrosCusto.ts` também são código não referenciado por
nenhuma tela, mas são um template documentado (`src/utils/newTableTemplate.ts` +
`src/docs/examples/new-auditable-entity.md`) para entidades auditáveis futuras — cai na exceção
que o usuário deu ("a não ser que isso possa ser usado em futuras integrações"), não foi tocado.

## ✅ Vendedor/operador na venda (2026-07-27)

Item (b) do backlog da avaliação de mercado (ver seção mais abaixo). Antes de implementar, o
usuário perguntou se o novo §11 do `CONTRATOS_CANONICOS_ERP.md` (pilares técnicos de integração,
ver seção correspondente abaixo) exigia alguma ação prévia — conclusão: não, o próprio §11.3 já
classifica as peças maiores de infraestrutura como decisão a tomar só quando houver satélite real.
Escolhido para implementar em seguida, com o pedido explícito de já deixar o gancho pronto para
essa informação também poder vir de módulos satélite no futuro (não só da UI direta).

- **Migração `20260727130000_adicionar_vendedor_venda.sql`**: `vendas.vendedor_id uuid NULL
  REFERENCES usuarios(id) ON DELETE SET NULL` + índice. Aponta para `usuarios` (não `auth.users`
  nem `colaboradores`) — só `usuarios` carrega `empresa_representada_id` junto e garante, via a
  constraint XOR de `docs/CONTRATOS_CANONICOS_ERP.md` §7, que é sempre uma pessoa real da empresa.
  Nullable e aditiva, sem backfill — vendas antigas ficam "não informado".
- **Gancho para satélites**: `vendedor_id` foi adicionado como campo opcional em
  `vendaCanonicalObjectSchema` (`supabase/functions/_shared/canonical/entities.ts`), que já herda
  o envelope de rastreabilidade (`origem_sistema`/`origem_canal`/`externo_id`/`idempotency_key`)
  via `origemEnvelopeSchema`. Um satélite só preenche `vendedor_id` quando já souber resolver seu
  vendedor/operador para um usuário real do NOVUS; ausente/null é o caminho normal e nunca bloqueia
  a ingestão — mesmo padrão já usado por `venda_pagamento.operador_id` (uuid solto, sem FK dura).
  Teste Deno adicionado em `entities.test.ts` cobrindo esse caso.
- **`VendaFormModal.tsx`**: novo Select "Vendedor" (grid do cabeçalho mudou de 3 para 4 colunas
  para acomodar sem quebrar o encaixe visual das linhas). Em venda nova, auto-preenche com o
  `usuarios` cujo `user_id` bate com o usuário logado (`useAuth()`), sem nunca sobrescrever uma
  escolha manual já feita. Se o usuário logado não tiver `usuarios` correspondente (ex.: admin sem
  vínculo de pessoa — confirmado ao vivo no ambiente de teste), o campo fica em branco para escolha
  manual, sem quebrar nada.
- **`usuarioService.fetchUsuariosAtivos()`** (novo, enxuto): `id, user_id, nome` de usuários ativos
  da empresa atual (RLS já escopa por tenant). Não reaproveitado de `fetchUsuarios()` porque esse
  já é legado com colunas desatualizadas (`nome_completo`, `cpf`, `ultimo_login`) que não existem
  mais na tabela `usuarios` real — drift de schema pré-existente, fora de escopo corrigir agora,
  só documentado aqui para não ser redescoberto como bug depois.
- **Exibição**: coluna "Vendedor" na lista (`Vendas.tsx`) e linha "Vendedor: {nome}" no
  `VendaViewDialog.tsx`, via embed `vendedor:usuarios(id, nome)` adicionado ao `select()` de
  `vendasService.list()`.
- **`src/integrations/supabase/types.ts` regenerado** (`supabase gen types typescript --linked`)
  para o PostgREST embed `vendas → usuarios` resolver corretamente — sem isso o typecheck falhava
  (`SelectQueryError` no campo `vendedor`, tipo desatualizado não conhecia a nova FK).
- Verificado ao vivo no navegador: Select lista os usuários ativos do tenant, venda nova salva com
  vendedor selecionado, coluna da lista e badge de status (não afetado) coexistem, venda de teste
  removida depois (RASCUNHO, sem baixa de estoque disparada).

## ✅ Itens de venda vinculados a catálogo + ativação da baixa de estoque real (2026-07-27)

Contexto: avaliação de mercado pedida pelo usuário (comparando Vendas com Square/Shopify POS/
Vendus/Conta Azul/TOTVS) apontou o gap de maior gravidade funcional: itens de venda eram texto/
preço livre, sem vínculo a `produto_id`/`servico_id`, logo sem baixa de estoque real.

- **`VendaFormModal.tsx`**: cada item agora tem um seletor Tipo (Produto/Serviço) + o
  `CatalogoItemPicker` (já existente, usado em Orçamentos — reuso direto, não construção nova),
  preenchendo descrição/preço a partir do cadastro e gravando `produto_id`/`servico_id`.
  Validação de estoque no `handleSubmit` (mesmo padrão de `Orcamentos.tsx`): bloqueia com toast se
  a quantidade pedida exceder o saldo de um produto com `controla_estoque = true`.
- **Achado relevante durante a investigação**: as RPCs `baixar_estoque_venda`/
  `estornar_estoque_venda` (SECURITY DEFINER, idempotentes — 1 baixa por venda+produto garantida
  até por índice único no banco) **já existiam prontas desde a migração do módulo de Estoque
  (2026-07-13) e nunca foram chamadas de lugar nenhum** — recurso construído e esquecido, mesmo
  padrão do que aconteceu com `has_permissao` antes da Porta 3.
- **Ativado** em `vendasService.ts`: `save()` chama `baixar_estoque_venda` (best-effort — não
  bloqueia o salvamento da venda se falhar, só loga erro) sempre que o status salvo não é
  `RASCUNHO`/`CANCELADO`, usando a primeira localização ativa (`localizacaoService.getAll()` — o
  tenant de teste tem só 1, "Depósito Central", então não foi necessário adicionar seletor de
  local no formulário). `cancelar()` chama `estornar_estoque_venda` da mesma forma best-effort.
- **Limitação conhecida, não resolvida nesta rodada (comportamento pré-existente da RPC, fora de
  escopo redesenhar agora)**: `baixar_estoque_venda` verifica só "existe baixa para este
  produto nesta venda?" — se sim, pula. Ou seja, editar a **quantidade** de um item já baixado
  (numa venda já CONFIRMADO+) não ajusta a baixa existente. Só um produto novo adicionado depois
  é baixado corretamente. Documentado aqui para não ser redescoberto como bug depois.
- **Segundo achado, mais sério, encontrado testando o ciclo completo no navegador**:
  `produtos.estoque_atual` (campo mostrado no `CatalogoItemPicker` e usado na validação de
  estoque insuficiente — tanto em Vendas quanto, já antes, em Orçamentos) **nunca era atualizado**
  pelo livro-razão real (`estoque_movimentacoes` → `recalc_saldo_estoque` → `estoque_saldos`). Dois
  números de estoque paralelos e desencontrados: confirmado ao vivo (baixei 2 unidades reais de um
  produto, `estoque_saldos` foi para 0 corretamente, `produtos.estoque_atual` continuou em 15).
  **Corrigido** (migração `20260727120000_sincronizar_produtos_estoque_atual.sql`):
  `recalc_saldo_estoque` agora também sincroniza `produtos.estoque_atual` com a soma real de
  `estoque_saldos` do produto (todas as localizações) toda vez que é chamada — mais um backfill
  de uma vez para produtos que já tinham saldo real divergente do cadastro. Aplicada e verificada
  ao vivo no projeto real.
- **Testado ao vivo no navegador, ciclo completo**: criei venda real (Calça Uniforme 5 anos, 2un,
  CONFIRMADO) → `estoque_movimentacoes` recebeu SAIDA correta, `estoque_atual` sincronizou de 15
  para 0 (confirmado no próprio seletor de produto, em tempo real) → tentei vender mais 1 unidade
  com saldo real 0 → bloqueado pelo toast de estoque insuficiente **antes de qualquer request ao
  Supabase** (confirmado via `read_network_requests`, zero POST em `vendas`) → cancelei a venda
  original → `estornar_estoque_venda` gerou a reversão (ENTRADA), soft-deletou a SAIDA original,
  `estoque_atual` voltou a refletir o saldo real corretamente. Tentativa de excluir a venda
  cancelada foi **corretamente bloqueada** por `ConfirmDeleteWithDeps` (detectou vínculo real com
  `estoque_movimentacoes`) — deixada como CANCELADO, mesmo tratamento já dado aos rastros de teste
  da Porta 3 (LIGNUM é tenant descartável, será apagada por completo depois de tudo testado).
- `npm run typecheck` limpo; `npm run test -- --run` com uma rodada inicial mostrando falhas de
  timeout de worker do Vitest (contenção de recursos, dev server + Chrome rodando juntos) — os
  arquivos que falharam foram reexecutados isoladamente e passaram em ~3s, confirmando que não é
  regressão real.

## ✅ Padronização de cor por status de Venda (2026-07-27)

Pedido explícito do usuário: sinalização visual por cor para status, com um padrão único
onde quer que o status apareça (ex.: também no Relatório de Vendas).

- Novo `src/utils/vendaStatusBadge.ts`: `VENDA_STATUS_LABEL` (rótulo amigável) e
  `VENDA_STATUS_BADGE_CLASS` (classe de cor por status — cinza/rascunho, secundário/confirmado,
  âmbar/em produção, azul/faturado, verde/entregue, vermelho/cancelado — dark mode incluso).
  Fonte única, reaproveitada nos 3 lugares onde o status de venda aparece como badge:
  `pages/vendas/Vendas.tsx`, `components/vendas/VendaViewDialog.tsx`,
  `pages/vendas/Relatorios.tsx`. Escopo deliberadamente restrito a `VendaStatus` (confirmado via
  grep — 6 arquivos usam esse tipo) — não mexido em status de outros domínios (contratos, fiscal,
  estoque, financeiro), que têm vocabulário e already-existente esquema de cor próprios.
- Verificado visualmente no navegador nas 3 telas. `npm run typecheck`/`build` limpos.

## ✅ Unificação parcial dos mecanismos de crédito (2026-07-27)

Frente 6 da lista "Próxima frente funcional" (abaixo) — escolhida e concluída nesta sessão, como
continuação direta da Porta 3.

- **Achado**: os dois mecanismos de checagem de crédito não eram só vocabulários diferentes —
  divergiam de verdade. `verificar_autorizacao_venda` (Porta 3, usado por `VendaFormModal.tsx`)
  checa títulos vencidos em `contas_receber`; `validar_pagamento_venda` (usado só dentro de
  `converter_orcamento_em_venda`, fluxo de conversão de orçamento) **nunca** checava isso — só
  `cliente_politica_pagamento.status = 'BLOQUEADO'` explícito. Um cliente inadimplente mas com
  status ainda `ATIVO` passava batido na conversão de orçamento, embora fosse barrado no
  formulário direto de venda.
- **Fix (escopo mínimo, decidido com o usuário)**: migração
  `20260727100000_unificar_inadimplencia_validar_pagamento.sql` — `validar_pagamento_venda` agora
  chama `verificar_autorizacao_venda` internamente e importa só o bloqueio `CLIENTE_INADIMPLENTE`
  para dentro do array `erros`. Não duplica `CLIENTE_BLOQUEADO`/`LIMITE_CREDIARIO_EXCEDIDO` (já
  cobertos pelos códigos pré-existentes `CLIENTE_BLOQUEADO`/`CREDIARIO_SEM_LIMITE`) nem transforma
  o aviso `CLIENTE_EM_ANALISE` em bloqueio — ambos ficaram fora do escopo mínimo escolhido.
  Aplicada e verificada ao vivo no projeto real (`lrkebsznehpuascgqbri`).
- **Nenhuma mudança de frontend necessária**: `ConverterVendaDialog.tsx` já exibe cada item de
  `erros` genericamente (`[codigo] mensagem`) quando a RPC retorna `PAGAMENTO_INVALIDO` — o novo
  código `CLIENTE_INADIMPLENTE` aparece na lista sem precisar tocar no componente.
- **Testado** dentro de uma transação `BEGIN...ROLLBACK` (nada persistiu) contra dado real: cliente
  conhecido do smoke test da Porta 3 (Maxwell Roger de Oliveira, títulos vencidos), simulando uma
  linha de `venda_pagamento` de natureza `CREDIARIO_PROPRIO` — `CLIENTE_INADIMPLENTE` passou a
  aparecer corretamente em `erros`. Confirmado via `select count(*)` pós-rollback que nada ficou
  gravado.
- **Gap que permanece, não resolvido nesta rodada (decisão consciente, não esquecimento)**:
  `converter_orcamento_em_venda` continua sem nenhum caminho de exceção auditada — bloqueio nesse
  fluxo é sempre terminal (`RAISE EXCEPTION` desfaz a transação inteira, usuário só pode cancelar e
  ajustar dados), diferente da Porta 3 no formulário direto, que permite superar com justificativa
  auditada. Unificar UX/permissão de exceção nos dois fluxos é trabalho futuro maior, não feito
  agora por escolha explícita do usuário (opção "mínimo" vs. "completo").
- Nenhum arquivo `.ts`/`.tsx` foi alterado nesta frente (mudança 100% no banco) — `npm run
  typecheck` seguiu limpo por não haver nada nele para quebrar.

## ✅ Porta 3 — crédito/inadimplência implementada e implantada (2026-07-26)

Fase 3 do roadmap (`docs/CONTRATOS_CANONICOS_ERP.md` §6/§10), opção 1 da lista de próximas
frentes funcionais abaixo — escolhida e concluída nesta sessão.

- Migração `20260726210000_porta3_credito_inadimplencia.sql`, aplicada e verificada ao vivo no
  projeto real (`lrkebsznehpuascgqbri`): função `has_permissao(user_id, permissao)` (checagem
  granular server-side via `usuarios.perfil_id -> perfis_acesso.permissoes`), tabela de auditoria
  `porta3_autorizacoes_excecao`, RPCs `verificar_autorizacao_venda` e `autorizar_excecao_venda`.
  Nova permissão granular `vendas.autorizarInadimplencia` (`critica: true`) em
  `PermissionsSelector.tsx`.
- **Smoke test funcional real rodado contra dados de produção** (via `supabase db query --linked`,
  simulando `auth.uid()` com `request.jwt.claims`, sem nenhuma escrita): `verificar_autorizacao_venda`
  detectou corretamente um cliente real com título vencido (`CLIENTE_INADIMPLENTE`, R$165 vencidos);
  o gate de acesso multi-tenant rejeitou corretamente um `user_id` sem vínculo com a empresa
  (`42501 access denied`); `has_permissao` retornou `false`/`true` corretamente para uma permissão
  ainda não concedida vs. uma já existente no perfil.
- Cableado no fluxo principal de criação de venda: `VendaFormModal.tsx` chama
  `verificar_autorizacao_venda` antes de salvar quando o plano de pagamento selecionado tem
  natureza `CREDIARIO_PROPRIO`; se bloqueado, abre `AutorizacaoExcecaoVendaDialog` (justificativa
  auditada, mín. 15 caracteres) que chama `autorizar_excecao_venda` antes de persistir a venda.
- **Gap conhecido, não resolvido nesta sessão**: o fluxo de conversão de orçamento em venda
  (`ConverterVendaDialog.tsx` → RPC `converter_orcamento_em_venda`) já tinha sua própria validação
  pós-inserção (`validar_pagamento_venda`, vocabulário de códigos diferente:
  `CLIENTE_BLOQUEADO`/`CREDIARIO_SEM_LIMITE`). Os dois mecanismos ficam paralelos por ora — unificar
  é trabalho futuro, não bloqueante.
- **Validado ponta a ponta no navegador real** (via extensão Claude em Chrome, sessão logada
  manualmente pelo usuário — nunca por mim, credenciais nunca inseridas por mim). Fluxo completo
  contra o tenant real (`LIGNUM COMERCIO E EXPORTACOES LTDA`, mesmo cliente do smoke test SQL,
  Maxwell Roger de Oliveira, R$165 vencidos): Nova Venda → cliente + plano crediário → aviso
  "venda a prazo" aparece → Salvar → `verificar_autorizacao_venda` bloqueia com
  `CLIENTE_INADIMPLENTE` e o motivo real → `AutorizacaoExcecaoVendaDialog` abre → justificativa →
  `autorizar_excecao_venda` grava em `porta3_autorizacoes_excecao` (3 linhas de teste ficaram
  gravadas ali, identificáveis pela justificativa "Teste automatizado..." — mantidas de propósito,
  não faz sentido apagar linha de tabela de auditoria) → venda salva. Registro de teste (venda
  RASCUNHO R$1,00) foi excluído depois via UI; nada de produção ficou pendurado.
- **Bug real encontrado e corrigido durante essa validação (não é da Porta 3, mas bloqueava
  qualquer criação de venda nova pelo formulário principal)**: `vendas.tipo` é `NOT NULL` com
  `CHECK IN ('P','S','H')` no banco, mas nem o tipo TS `Venda` nem `VendaFormModal.tsx` nunca
  preenchiam esse campo — todo `insert` em `vendas` pelo fluxo principal retornava `400`. Só não
  tinha sido notado porque o fluxo alternativo (`converter_orcamento_em_venda`) define `tipo` no
  servidor. Corrigido em `src/services/vendasService.ts` (`save`): default `'P'` no insert, mesmo
  fallback já usado por aquela RPC. Confirmado com `npm run typecheck`/`test`/`build` depois do fix.
- Efeito colateral permanente e intencional desta sessão: a LIGNUM não tinha nenhum plano de
  pagamento com natureza `CREDIARIO_PROPRIO` cadastrado (só "PIX"), o que também deixava a Porta 3
  inatingível na prática. Criei um plano real "Crediário Próprio" (`planos_pagamento`) para poder
  testar — decisão do usuário foi manter (não era só artefato de teste, era infraestrutura real
  faltando).

## ✅ Correção de segurança implantada (2026-07-26)

**Vazamento entre empresas em `sync-webhook`/`retry-failed-syncs` — corrigido e em produção.**

- Commit: `83d639a` (código). Deploy: `supabase functions deploy sync-webhook` e
  `supabase functions deploy retry-failed-syncs`, ambos confirmados no projeto real
  (`lrkebsznehpuascgqbri`) em 2026-07-26. Smoke check pós-deploy: `OPTIONS` em
  `https://lrkebsznehpuascgqbri.supabase.co/functions/v1/sync-webhook` → `200 OK`.
- O que era: `sync-webhook` (endpoint real de ingestão de satélites, autenticado por HMAC por
  empresa) e `retry-failed-syncs` faziam busca/gravação de
  `clientes`/`vendas`/`contratos`/`contas_receber` **sem filtrar por `empresa_representada_id`**.
  Duas empresas com CPF ou número de documento/venda/contrato coincidentes podiam ter uma
  sobrescrevendo o registro da outra via webhook assinado. Detalhe completo na mensagem do commit
  `83d639a`.
- Sem cobertura de typecheck/teste automatizado nesses arquivos (ver `CLAUDE.md` — pontos cegos
  conhecidos). Verificado por leitura cuidadosa + `eslint` limpo + smoke check manual pós-deploy —
  não há teste automatizado de regressão para isso ainda. Se algo relacionado a ingestão de
  satélite se comportar estranho, comece por aqui.
- **Sem ação pendente crítica no momento.**

## Saúde técnica (verificado ao vivo em 2026-07-26, não de memória)

- `npm run typecheck`: **0 erros** (era um script inoperante até 2026-07-24 — checava zero
  arquivos por causa do `tsconfig.json` raiz; corrigido, e os 182 erros reais que isso escondia
  foram todos corrigidos).
- `npm run test -- --run`: **357/357 passando** (45 arquivos de teste).
- `npm run build`: passa.
- Lint `@typescript-eslint/no-explicit-any`: **⚠️ CORREÇÃO (2026-07-27): a alegação de "ZERO em
  todo o repositório" abaixo (2026-07-26) estava errada.** Rodando `npm run lint` de novo em
  2026-07-27 (durante o trabalho de vendedor/operador na venda) apareceram **56 erros em 16
  arquivos** (`src/services/*` majoritariamente — vendasService.ts, contasPagarService.ts,
  contasReceberService.ts, contratosService.ts e outros; mais `types/fornecedor.ts`,
  `pages/rh/IntegracaoPonto.tsx`, 2 edge functions). Confirmado via
  `git show 4ffc6de:src/services/vendasService.ts` que pelo menos um desses `any` já existia **no
  próprio commit que alegou zero** — a verificação "`npx eslint . --format json` confirma 0" não
  foi de fato precisa para o repo inteiro (causa raiz não apurada). Não é regressão desta sessão.
  Não corrigido ainda — é um novo item de backlog, não incidental, a decidir com o usuário se/quando
  atacar. Texto original (2026-07-26, mantido como registro, não mais confiável) da metodologia
  usada até então: um arquivo por vez, `typecheck` + suíte completa antes de cada commit; preferir
  remover cast desnecessário a inventar tipo novo; `unknown`/`Record<string, unknown>` para
  payload genuinamente dinâmico (JSONB, dado de satélite); um único cast documentado
  `as unknown as TargetType` no retorno quando o shape de embed do Supabase é imprevisível demais
  para tipar campo a campo (padrão usado em ~10 services). Achados reais corrigidos de passagem:
  `Departamento` (types/rh.ts) não tinha `responsavelId` apesar de ser campo usado de verdade;
  `fiscal/configService.ts` usava `parseFloat` em colunas que já são `number` (nunca fazia
  sentido, mascarado pelo `any`).

## Riscos arquiteturais registrados (não são bugs — decisões conscientes a revisitar)

**Dependência de fornecedor único (vendor lock-in) — registrado 2026-07-26.** O projeto é
fortemente acoplado ao Supabase, não só como "um banco Postgres qualquer": isolamento entre
empresas via RLS amarrado a `auth.uid()`, RPCs chamadas direto do frontend
(`supabase.rpc(...)`), sintaxe de embed própria do PostgREST, e Auth/Storage/Edge Functions sem
substituto plug-and-play. A fronteira de serviço (`src/services/**`) reduz o tamanho de uma
eventual migração (UI e regras de negócio React sobreviveriam quase intactas) mas não elimina o
trabalho — `src/services/**`, o schema e Auth/Storage/Edge Functions precisariam ser refeitos.
**Escopo ampliado pelo usuário**: a mesma preocupação vale para qualquer dependência de
ferramenta única e substituível — repositório/hospedagem de código, banco de dados, e futuras IAs
embarcadas como peça central do produto (não só usadas para desenvolver). **Não é ação
pendente** — é um aviso guardado para consulta rápida, a ser revisitado antes de escalar
significativamente, antes de assumir estabilidade de longo prazo de um fornecedor num contrato de
integração de satélite, ou se algum desses fornecedores deixar de ser uma aposta segura. Não
construir uma camada de abstração genérica agora, sem fornecedor alternativo real em vista
(mesmo risco de over-engineering identificado noutras partes do projeto).

## Backlog de prontidão para satélites (isolamento/permissões/tradução)

Ledger de gaps que ameaçam a promessa central do hub (isolamento entre empresas, cadeia de
permissões, tradução correta de dado de satélite) — quando um gap é achado durante outro trabalho
e não é seguro/rápido corrigir na hora, ele é anotado aqui com endereço exato (arquivo:linha) em
vez de esquecido. **Vazamento real (isolamento) é corrigido assim que identificado, não adiado —
essa é a regra desde 2026-07-25.**

- ✅ Resolvido em código e implantado: ver seção acima.
- Nenhum outro item aberto no momento desta atualização.

## Decisões de identidade visual/UX em aberto

Conversa iniciada em 2026-07-25, ainda não implementada — apenas decisões e referências
registradas:

- Princípio acordado: **inspirar-se, não copiar**, elementos que não comprometam desempenho.
  Marca Novus.AI / Novus ERP (logo, nome) é **não-negociável**, nunca muda — isso vale só para o
  tema por empresa/tenant, nunca para a marca do próprio produto.
- Referências reunidas: Flowlu (landing page, paleta limpa mas pouco aplicável — não é tela real
  de trabalho), TOTVS Protheus (screenshot real de tela de cotações — sidebar escura, tabela densa
  com badges de status e ordenação, referência mais forte por ser ERP brasileiro real), um mockup
  genérico de dashboard (KPIs + gráficos coloridos — aponta um gap real: `src/pages/Dashboard.tsx`
  hoje não tem nenhum gráfico).
- Ideia em avaliação, não iniciada: tema por empresa derivado automaticamente da logo enviada no
  onboarding do cliente. Avaliação técnica: viável e barato (extração de cor uma vez, no
  onboarding; variáveis CSS por tenant), mas **sequenciado para depois** de existir uma identidade
  visual estática definida — não faz sentido variar uma base que ainda vai mudar.
- Próxima decisão do usuário, ainda não tomada: escolher o tom dominante (sóbrio/corporativo tipo
  Protheus vs. colorido/energético tipo o mockup) antes de qualquer implementação visual.

## Próxima frente funcional (a decidir — Porta 3/crédito concluída 2026-07-26, unificação parcial 2026-07-27)

Opções 1 e 6 (abaixo) foram escolhidas e concluídas (ver seções acima). Opções restantes, nenhuma
escolhida ainda:

2. Estoque de bem locável (§8 de `docs/CONTRATOS_CANONICOS_ERP.md`) — pré-requisito para satélite
   de locação, maior escopo.
3. Camada de adaptador por `source_system` (Fase 2 do roadmap, §10) — melhor construir depois de
   ter um caso real de satélite pra validar contra, risco de abstração errada se feito cedo demais.
4. Protótipo de satélite real (o mais concreto para provar o modelo ponta a ponta, maior esforço).
5. Identidade visual estática (ver seção acima) — decisão de tom dominante ainda pendente do
   usuário, separada das frentes funcionais 2-4.
6. ~~Unificar `verificar_autorizacao_venda`/`autorizar_excecao_venda` com a validação paralela
   `validar_pagamento_venda` do fluxo de conversão de orçamento~~ — **concluído em escopo mínimo
   2026-07-27** (ver seção acima). Gap restante (exceção auditada só existe no formulário direto,
   não na conversão de orçamento) documentado como trabalho futuro, não crítico.

### Backlog derivado da avaliação de mercado do módulo de Vendas (2026-07-27)

Usuário pediu avaliação sincera comparando Vendas com POS/ERP de mercado (Square, Shopify POS,
Vendus, Conta Azul, TOTVS), para pequeno negócio (oficina, lojinha, loja de itens prontos).
Achados completos e a lista original priorizada estão na conversa da sessão, não duplicados aqui
para não desatualizar — resumo do que já foi decidido/concluído:

- ~~Itens de venda vinculados a catálogo + baixa de estoque real~~ — **concluído 2026-07-27** (ver
  seção acima, inclui o achado e fix de `produtos.estoque_atual` dessincronizado).
- ~~Cor por status de venda~~ — **concluído 2026-07-27** (ver seção acima).
- ~~Vendedor/operador na venda~~ — **concluído 2026-07-27** (ver seção acima; inclui o gancho de
  ingestão via satélite em `vendaCanonicalObjectSchema`).
- Itens ainda não escolhidos pelo usuário, por ordem de gravidade levantada na avaliação: (a)
  desconto percentual (só existe valor fixo hoje); (c) fluxo de "venda rápida"/balcão (maior gap de
  UX para o público-alvo, mas não deve virar um "modo POS" completo — over-engineering pro estágio
  atual); (d) KPIs na tela de lista de Vendas (lógica já pronta em `Relatorios.tsx`, é reuso);
  (e) filtros por cliente específico/forma de pagamento em Vendas.tsx e Relatorios.tsx (padrão de
  filtro por forma de pagamento já existe em `ContasReceberFilters.tsx`, outro módulo); (f)
  `origem`/`canal_venda` são campos mortos no schema (relevantes para quando satélites chegarem,
  mas não vale elaborar domínio de valores agora — um Select simples já destrava relatório).

## ✅ PDF/impressão de Vendas (2026-07-27)

Usuário pediu, na sequência da unificação de crédito acima: orçamentos já tinha geração de PDF/
impressão funcional (`OrcamentoAcoesMenu.tsx` + `OrcamentoViewDialog.tsx` + `utils/orcamentoPdf.ts`);
vendas não tinha nada equivalente. Escolhido (com o usuário) o desenho em paridade total com
Orçamentos: menu de ações (⋮) na linha da tabela + diálogo de visualização somente leitura,
`VendaFormModal.tsx` (edição) não mexido.

- **Novo**: `src/utils/vendaPdf.ts` (espelha `orcamentoPdf.ts` — mesmo layout timbrado com
  logo/CNPJ/endereço, blocos Produtos/Serviços via `jspdf`/`jspdf-autotable`, totais e rodapé),
  `src/components/vendas/VendaViewDialog.tsx` (espelha `OrcamentoViewDialog.tsx`),
  `src/components/vendas/VendaAcoesMenu.tsx` (espelha `OrcamentoAcoesMenu.tsx`, mas só com as ações
  de documento — Visualizar/Imprimir/Baixar PDF/E-mail/WhatsApp — sem Duplicar/Converter, que não
  fazem sentido para uma venda já criada; os botões de Editar/Cancelar/Excluir/Emitir NF-e/Gerar
  Títulos que já existiam em `Vendas.tsx` continuam como estavam, fora do menu).
- **Achado que exigiu ajuste de schema/tipo**: `ItemVenda` (`types/vendas.ts`) não expunha
  `tipo_item` (a coluna existe em `itens_venda` e é gravada por `vendasService.save()`, só não
  estava no tipo TS) — sem isso não dava pra replicar o split Produtos/Serviços do PDF de
  orçamentos. Adicionado `tipo_item?: 'P' | 'S'` ao tipo (aditivo, sem migração — coluna já existia).
- **Wiring em `src/pages/vendas/Vendas.tsx`**: passou a buscar `clientes`/`empresas`/logos (mesmos
  hooks que `Orcamentos.tsx` já usa — `useClientes`, `useEmpresasRepresentadas`,
  `useEmpresasLogosMap`, `useEmpresaAtual`) para montar os dados completos de cliente/empresa que o
  PDF timbrado precisa (o `select` de `vendasService.list()` só trazia `cliente:{id,nome}`).
- **Testado ao vivo no navegador** (Claude em Chrome, mesma sessão logada): menu de ações abre
  corretamente; "Visualizar" mostra o diálogo com timbrado (logo da LIGNUM carregada), cliente,
  blocos Produtos E Serviços corretamente separados (venda real de teste tinha os dois tipos:
  "Camiseta Uniforme 5 anos" e "Hora Trabalhada - Serviços Gerais"), subtotais e total; "Baixar PDF"
  gerou o arquivo sem erro no console. "Imprimir" não foi clicado no teste automatizado (abre
  diálogo de impressão nativo do SO, que pode travar a sessão de automação) — usa a mesma função de
  build do PDF que "Baixar PDF" já validou, risco residual baixo.
- `npm run typecheck` / `npm run test -- --run` (357/357) / `npm run build` — todos passando após
  a mudança.

**Correção pós-entrega (mesmo dia, a pedido do usuário)**: a primeira versão só replicava
itens+totais de Orçamentos, sem nenhuma informação financeira — usuário apontou corretamente que
era "ctrl-C/ctrl-V" e que faltava forma de pagamento e parcelas. Investigação mostrou que uma Venda
pode ter essa informação em **dois lugares diferentes**, dependendo de como foi criada:
- Via `ConverterVendaDialog` → `converter_orcamento_em_venda`: cria linha real em `venda_pagamento`
  (+ `venda_pagamento_parcelas`) com modalidade/qtd_parcelas/valores concretos.
- Via `VendaFormModal` (fluxo direto): só grava `vendas.plano_pagamento_id`, **nunca** cria linha em
  `venda_pagamento` — não há parcelas concretas geradas, só a referência ao plano escolhido.

Novo `src/utils/vendaPagamentoInfo.ts` (`resolveVendaPagamentoInfo`) resolve isso: tenta
`venda_pagamento` primeiro (via `vendaPagamentoService`, já existente), e só cai para
`planos_pagamento` (via `planosPagamentoService.getAll()`, já existente) se não houver nenhuma
linha. `vendaPdf.ts` e `VendaViewDialog.tsx` agora mostram uma seção "Pagamento" com forma/natureza/
parcelas (tabela de parcelas quando há mais de uma) ou, no fallback, o plano e o parcelamento
previsto. **Testado ao vivo com os dois casos reais**: uma venda com `venda_pagamento` (PIX à vista,
R$160) mostrou "Forma: PIX — à vista — R$ 160,00 / Vencimento: 27/07/2026"; uma venda sem
`venda_pagamento` (só `plano_pagamento_id`) mostrou corretamente o fallback "Plano: PIX / Natureza:
À vista / 1x prevista(s)...". `npm run typecheck`/`test -- --run` (357/357) confirmados de novo
depois do ajuste.
