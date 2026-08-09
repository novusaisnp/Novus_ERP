# Status do projeto — NOVUS ERP

**Última atualização: 2026-08-09 (banco reksodqzemboaeqxnxyy sincronizado, ~40 migrações atrasadas aplicadas).**
Este arquivo deve ser atualizado ao final de cada sessão de trabalho relevante — se estiver desatualizado, ele
apodrece como `SYSTEM_AUDIT.md`/`ARVORE_PROJETO.md` já apodreceram. Leia primeiro [`../CLAUDE.md`](../CLAUDE.md)
para contexto de padrões estáveis; este arquivo é sobre o que está pendente **agora**.

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
