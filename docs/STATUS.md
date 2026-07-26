# Status do projeto — NOVUS ERP

**Última atualização: 2026-07-26.** Este arquivo deve ser atualizado ao final de cada sessão de
trabalho relevante — se estiver desatualizado, ele apodrece como `SYSTEM_AUDIT.md`/`ARVORE_PROJETO.md`
já apodreceram. Leia primeiro [`../CLAUDE.md`](../CLAUDE.md) para contexto de padrões estáveis;
este arquivo é sobre o que está pendente **agora**.

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
- Lint `@typescript-eslint/no-explicit-any`: **235 ocorrências restantes** (começou em 1222).
  Não bloqueia `ci:gate`, é limpeza em andamento, sem urgência funcional. Próximos arquivos por
  volume (rode `npx eslint . --format json` para atualizar antes de continuar):
  ```
  13  src/hooks/useClientes.test.ts
  12  src/hooks/useFornecedores.test.ts
  9   src/utils/auditableServiceTemplate.ts
  8   src/utils/clienteUtils.ts
  8   src/services/cnpjApi.test.ts
  8   src/services/produtoService.test.ts
  7   src/__tests__/lote3d.test.ts
  7   src/utils/clienteUtils.test.ts
  7   src/utils/rhUtils.ts
  6   src/services/fornecedorService.test.ts
  ```
  Metodologia: um arquivo por vez, `typecheck` + suíte completa antes de cada commit, preferir
  remover cast desnecessário a inventar tipo novo, usar `unknown`/`Record<string, unknown>` para
  payload genuinamente dinâmico (JSONB, dado de satélite).

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

## Próxima frente funcional (ainda não decidida — pausada em favor do lint)

Opções já mapeadas, nenhuma escolhida ainda:

1. Porta 3 — autorização de crédito/inadimplência (`verificar_autorizacao_venda`, ver
   `docs/CONTRATOS_CANONICOS_ERP.md` §6) — menor escopo, gera valor mesmo sem satélite conectado.
2. Estoque de bem locável (§8 do mesmo doc) — pré-requisito para satélite de locação, maior escopo.
3. Camada de adaptador por `source_system` (Fase 2 do roadmap, §10) — melhor construir depois de
   ter um caso real de satélite pra validar contra, risco de abstração errada se feito cedo demais.
4. Protótipo de satélite real (o mais concreto para provar o modelo ponta a ponta, maior esforço).

Decisão de 2026-07-25: terminar a limpeza de lint primeiro, manter a fundação 100% consistente
antes de abrir frente nova.
