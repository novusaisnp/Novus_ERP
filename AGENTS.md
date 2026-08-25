# NOVUS ERP — contexto para quem for mexer neste projeto

Leia isto antes de qualquer mudança. Para saber **o que está pendente agora**, vá direto a
[`docs/STATUS.md`](./docs/STATUS.md) — este arquivo é sobre padrões e regras estáveis, aquele é o checkpoint do momento.

## O que é

ERP multi-tenant (Vite + React 18 + TypeScript + Supabase). Visão de produto: NOVUS funciona
sozinho como ERP completo para negócios de menor complexidade, e também como hub que recebe
dados de módulos satélite futuros (o primeiro será um sistema de gestão escolar, "Novus
Educacional") via um modelo de 3 portas — Título / Liquidação / Autorização. O modelo completo
está formalizado em [`docs/PLANO_MESTRE.md`](./docs/PLANO_MESTRE.md) (Parte 1).

## Stack e arquitetura

- Vite 5 + React 18 + TypeScript + Tailwind/shadcn-ui + TanStack Query + React Hook Form + Zod.
- Supabase: Postgres + Auth + Storage + Edge Functions (Deno). Projeto real: `reksodqzemboaeqxnxyy`
  (migrado de `lrkebsznehpuascgqbri` em 2026-08-08) — **sempre confirme com `supabase projects list`
  antes de qualquer ação em banco**, nunca confie de memória em qual ID é o certo.
- Multi-tenancy: quase toda tabela tem `empresa_representada_id`, aplicado via RLS. Isolamento
  entre empresas é requisito de segurança de primeira classe, não um detalhe — ver a seção de
  segurança abaixo.
- **Toda leitura/escrita no Supabase passa por `src/services/**`** — nada de chamar o client
  Supabase direto de componente/hook. Fronteira de serviço é regra, não sugestão.
- Testes: Vitest (`npm run test -- --run`). E2E: Playwright em `e2e/`.

## Comandos essenciais

```
npm run typecheck   # tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit
npm run test -- --run
npm run build
npm run lint
```

**Antes de qualquer commit**: typecheck limpo + suíte de testes passando. Não pule isso.

## Pontos cegos conhecidos (importante)

- **`supabase/functions/**` (Deno, edge functions) NÃO é coberto por `npm run typecheck`**
  (fora do `include` de `tsconfig.app.json`) **nem pela suíte Vitest**. Mudanças ali só têm
  `eslint` (sintático, não type-aware) como rede de segurança automatizada — revise com mais
  cuidado manual do que o resto do código, e deploy (`supabase functions deploy <nome>`) é uma
  ação separada e manual do `git push`, ninguém sobe edge function sozinho.
- Os docs de auditoria de julho/2026 e a auditoria de agosto/2026 (execução já concluída)
  estão arquivados em `docs/archive/` — histórico, não fonte de verdade. Não confie neles
  sem re-verificar contra o código real.

## Padrões e armadilhas já resolvidos (não redescubra)

- **`empresa_representada_id` ausente em `insert()`**: é `NOT NULL` em quase toda tabela. Padrão
  usado nos services: um helper local `getEmpresaIdAtual()` que chama
  `supabase.rpc('get_user_empresa_id')`.
- **`contas_receber` usa `valor_recebido`/`data_recebimento`; `contas_pagar` usa
  `valor_pago`/`data_pagamento`** — são nomes diferentes, já causou bug real mais de uma vez.
  Ambas usam `status`, nunca `situacao`.
- **Duas FKs da mesma tabela para outra tabela** (ex.: `movimentacoes_bancarias` tem
  `conta_bancaria_id` e `conta_destino_id`, ambas → `contas_bancarias`) exigem hint de embed pelo
  **nome da constraint FK**, não pelo nome da coluna: `contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey`.
- **PowerShell (`-replace`, `Set-Content`, `Out-File`) corrompe caracteres acentuados em
  português**, mesmo em edições triviais. Regra sem exceção: usar as ferramentas de edição de
  arquivo (Edit/Write), nunca substituição de texto via PowerShell, em qualquer arquivo com
  conteúdo não-ASCII.
- **Quando UI e banco divergem**: o ajuste por padrão é no banco (migração aditiva —
  `ADD COLUMN IF NOT EXISTS`, nunca `DROP`/`RENAME` em cima do que já existe), não simplificar a
  UI — **a menos que se confirme, com grep pelos consumidores reais, que é código morto/já
  superado**, caso em que o certo é ajustar o tipo TS para bater com o banco. Sempre checar as
  duas direções antes de decidir qual lado é "o bug".

## Segurança e isolamento entre empresas — não é opcional

Qualquer código que toque em dados de mais de uma empresa (edge functions de sync, jobs em lote,
qualquer coisa fora do fluxo normal de UI+RLS) precisa ter `empresa_representada_id` explícito em
toda busca e toda escrita — nunca confiar que "encontrou o registro" é suficiente sem checar de
quem é. Já houve um caso real disso quebrado em produção (ver `docs/STATUS.md`). Ao encontrar um
gap de isolamento, corrija assim que identificado — não adie para depois.

## Onde ler mais

- Arquitetura, backlog priorizado e pendências (documento único — funde o que antes
  era `CONTRATOS_CANONICOS_ERP.md` + `ROADMAP_2026.md` + `AUDITORIA_NOVA.md`):
  [`docs/PLANO_MESTRE.md`](./docs/PLANO_MESTRE.md)
- Estado atual, checkpoint sessão a sessão e próxima ação crítica: [`docs/STATUS.md`](./docs/STATUS.md)

## Documentação agnóstica de ferramenta

Documentos, comentários de checkpoint e mensagens persistidas no repositório devem descrever
estado, decisões, comandos e evidências sem citar fornecedor, marca, assistente ou ambiente
pessoal. O projeto precisa ser retomável por qualquer responsável técnico usando somente os
arquivos versionados.
