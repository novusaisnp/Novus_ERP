# Status do projeto — NOVUS ERP

**Última atualização: 2026-07-27.** Este arquivo deve ser atualizado ao final de cada sessão de
trabalho relevante — se estiver desatualizado, ele apodrece como `SYSTEM_AUDIT.md`/`ARVORE_PROJETO.md`
já apodreceram. Leia primeiro [`../CLAUDE.md`](../CLAUDE.md) para contexto de padrões estáveis;
este arquivo é sobre o que está pendente **agora**.

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
- Lint `@typescript-eslint/no-explicit-any`: **✅ ZERO ocorrências em todo o repositório**
  (começou a sessão em 1222; concluído em 2026-07-26 num único dia de trabalho, ~15 commits).
  `npx eslint . --format json` confirma 0. Esta frente está **fechada** — não é mais um item de
  backlog. Metodologia usada (documentada para o caso de o lint voltar a crescer): um arquivo por
  vez, `typecheck` + suíte completa antes de cada commit; preferir remover cast desnecessário a
  inventar tipo novo; `unknown`/`Record<string, unknown>` para payload genuinamente dinâmico
  (JSONB, dado de satélite); um único cast documentado `as unknown as TargetType` no retorno
  quando o shape de embed do Supabase é imprevisível demais para tipar campo a campo (padrão
  usado em ~10 services). Achados reais corrigidos de passagem: `Departamento` (types/rh.ts) não
  tinha `responsavelId` apesar de ser campo usado de verdade; `fiscal/configService.ts` usava
  `parseFloat` em colunas que já são `number` (nunca fazia sentido, mascarado pelo `any`).

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
