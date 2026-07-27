# Contratos Canônicos do NOVUS ERP — a "língua universal" do hub

**Data:** 2026-07-24
**Status:** Fase 1 (contratos de ingestão + liquidação formalizados, padrão de pré-checagem documentado) concluída. Fases 1b/2/3/4 abaixo são roadmap.

## 1. Visão

O NOVUS ERP funciona como um **hub SaaS único**: o núcleo profissional que centraliza Vendas, Financeiro, Estoque, RH, Fiscal etc. de cada empresa representada. A visão de produto é conectar **módulos satélite** futuros — um PDV, um sistema de gestão escolar, uma locadora de equipamentos, e outros — que capturam dados na linguagem específica do seu domínio (ex.: PDV fala de "cupom" e "caixa"; um sistema escolar fala de "matrícula" e "mensalidade") e trocam dados com o NOVUS, onde são **traduzidos e padronizados** para a linguagem universal de um ERP profissional.

Este documento formaliza essa linguagem universal: os **contratos canônicos** de cada entidade core, o **envelope de rastreabilidade** que identifica a origem de cada registro, o **padrão de pré-checagem/autorização** para a via de mão dupla, e o **escopo** de negócios que o NOVUS pretende atender.

## 2. As três portas de integração

Um satélite não troca dados com o NOVUS de uma forma só. Existem três portas, com naturezas diferentes:

### Porta 1 — Título (push, satélite → NOVUS)
O documento financeiro em si: descrição, valor, vencimento, forma de pagamento prevista, cliente. **Não importa o fator gerador** — uma mensalidade escolar, a venda de um uniforme, ou uma parcela de locação de equipamento chegam todas na mesma forma: um título em `contas_receber` (ou `contas_pagar`, no sentido inverso). O "gerador" (Venda, Contrato, ou o conceito que o satélite usa) é metadado opcional pendurado no título via o envelope de rastreabilidade (§3) — nunca um pré-requisito para o título existir. Contrato: `contaReceberCanonicalSchema` (§4).

### Porta 2 — Liquidação (push, satélite → NOVUS)
O evento "isso foi pago" — `titulo_id`, `valor_pago`, `data_pagamento`, `forma_pagamento`, opcionalmente dividido em múltiplas contas (`multi_baixa`). Desacoplado de como o título nasceu. Já existia como tipo (`LiquidacaoTitulo`) e serviço (`movimentacoesService.liquidarTitulo`) na UI; formalizado nesta revisão como `liquidacaoCanonicalSchema` (§4). Depois da liquidação, o dinheiro que efetivamente entrou é casado com o extrato bancário real pela conciliação bancária — isso é interno ao NOVUS, satélite nenhum precisa participar.

### Porta 3 — Consulta/Autorização (pull, satélite ↔ NOVUS, síncrona)
Diferente das duas primeiras, aqui o satélite **pergunta antes de agir localmente**, e o NOVUS responde com uma decisão, não só um dado. Dois exemplos reais que motivaram esta porta:

- **Estoque:** a entrada de estoque é operacionalizada no NOVUS (retaguarda), mas a venda acontece no PDV. Antes de vender, o PDV precisa perguntar "tem saldo?". **Já implementado**: RPC `validar_saldo_estoque(produto_id, localizacao_id, quantidade)` → `{ok, saldo_atual, quantidade_solicitada}`.
- **Crédito/inadimplência:** uma loja de roupas com crediário próprio não pode vender pra um cliente com parcela vencida e não conciliada, a menos que um usuário com permissão específica autorize a exceção. **Ainda não implementado** — desenhado em §6.

Não é uma função por caso — é uma **categoria**: toda vez que um satélite precisa decidir algo que depende de estado que só o NOVUS conhece, a resposta segue o mesmo formato padrão (`preflightResponseSchema`, `supabase/functions/_shared/canonical/preflight.ts`): `{autorizado, bloqueios: [{codigo, motivo, pode_ser_superado, permissao_necessaria}]}`. Novos casos que surgirem (reserva de horário numa oficina, limite de vagas numa turma) devem seguir esse mesmo formato em vez de inventar uma resposta ad-hoc.

## 3. O que já existia (achado na auditoria, não construído do zero)

Antes deste documento, o projeto já tinha peças reais desta arquitetura, construídas de forma pontual:

- **`sync-webhook`** (edge function): receptor de dados de sistemas externos, com assinatura HMAC versionada (v1/v2, dual-signing), cabeçalho `x-source-system` (identifica a origem), `x-empresa-id` (tenant), proteção contra replay e reprocessamento por tentativa.
- **`Webhooks.tsx`** + `WebhookConfigModal`: configuração de integrações **de saída** (NOVUS → sistema externo) por empresa.
- **FIN-E5** (migração `20260711120808_...sql`): rastreabilidade e idempotência no fluxo Venda → Conta a Receber (Porta 1). É aqui que nasceram os campos `origem_canal`, `origem_sistema`, `externo_id`, `idempotency_key`, `hash_payload`. A função `gerar_contas_receber_da_venda` já implementa idempotência real via hash SHA-256 do payload.
- **`data-validator`** (edge function): validação de payloads de entrada — mas até 2026-07-24 cobria só 4 tabelas com regras hardcoded, sem usar o envelope de origem.
- **`validar_saldo_estoque`** (RPC, sprint P12): já implementa a Porta 3 para o caso de estoque, security-definer, checando `has_role`/`user_has_access_to_empresa`.
- **`ClientePoliticaPagamento`** (sprint FIN-E2): política de crédito por cliente já modelada (`status` ATIVO/BLOQUEADO/EM_ANALISE, `limite_crediario`, `limite_utilizado`, `dias_max_atraso`, `motivo_bloqueio`) — falta só o cruzamento em tempo real com títulos vencidos, exposto como Porta 3 (§6).
- **Permissões granulares com flag `critica`** (`PermissionsSelector.tsx`): já existem permissões marcadas como críticas (`vendas.cancelamento`, `estoque.ajuste`) — o mesmo padrão serve para autorizar exceções na Porta 3.

Este documento formaliza esse padrão existente como **o** contrato oficial, em vez de deixá-lo implícito e parcial.

## 4. O envelope de rastreabilidade

Todo registro que **pode** ter sido originado por um sistema satélite carrega estes campos (todos opcionais — um registro criado direto na UI do NOVUS não tem sistema de origem):

| Campo | Tipo | Significado |
|---|---|---|
| `origem_sistema` | string | Identificador do sistema satélite que originou o dado (ex.: `pdv-loja-01`, `sistema-escolar-matriculas`). |
| `origem_canal` | string | Canal dentro do sistema de origem (ex.: `caixa-2`, `portal-matricula`). |
| `externo_id` | string | ID do registro no sistema de origem — permite correlacionar o registro do NOVUS com o registro original. |
| `idempotency_key` | string | Chave que identifica unicamente esta operação; reenvios com a mesma chave não duplicam o registro. |
| `hash_payload` | string | Hash (SHA-256) do payload normalizado; usado para detectar payloads divergentes reenviados sob a mesma chave (ver `gerar_contas_receber_da_venda`). |

Definido em código: `supabase/functions/_shared/canonical/envelope.ts` (`origemEnvelopeSchema`).

**Estado de persistência por tabela (2026-07-24):**

| Tabela | Envelope no banco? |
|---|---|
| `contas_receber` | ✅ completo (`venda_id`, `venda_pagamento_id`, `venda_pagamento_parcela_id` inclusos) |
| `vendas` | 🟡 parcial (só `hash_payload`) |
| `venda_pagamento` | 🟡 parcial (`origem_canal`, `origem_sistema`) |
| `venda_pagamento_parcelas` | 🟡 parcial (`externo_id`) |
| `clientes`, `produtos`, `contratos`, `estoque_movimentacoes`, `liquidacoes_titulos` | ❌ nenhum — contrato validado na Fase 1 é o **alvo**, extensão do schema do banco é Fase 1b (ver §7) |

## 5. Contratos por entidade

Fonte de verdade em código: `supabase/functions/_shared/canonical/entities.ts`. Os schemas Zod ali são a implementação executável deste documento — em caso de divergência, **o código manda**; atualize este documento para acompanhar, não o contrário.

Cada entidade tem dois schemas exportados:
- `<entidade>CanonicalObjectSchema` — schema-objeto puro, usado com `.partial()` para validar updates parciais.
- `<entidade>CanonicalSchema` — schema completo com regras cruzadas (ex.: "vencimento não pode ser antes da emissão"), usado para validar inserts.

### Cliente
`empresa_representada_id` (uuid, obrigatório) · `nome` (obrigatório) · `tipo` (`F`|`J`, obrigatório) · `apelido`, `email`, `telefone` (opcionais) · `cpf_cnpj` (validado por dígito verificador real, não só formato) · `ativo` (default `true`) · + envelope de origem.

### Produto
`empresa_representada_id` (obrigatório) · `nome` (obrigatório) · `codigo`, `categoria_id` (opcionais) · `preco_custo` (opcional) · `preco_venda` (obrigatório, não-negativo) · `ncm`, `estoque_atual`, `estoque_minimo`, `controla_estoque`, `ativo` · + envelope de origem.

### Venda (+ Itens)
`empresa_representada_id` (obrigatório) · `cliente_id`, `numero_venda` (opcionais) · `data_venda` (obrigatório, data válida) · `status` (enum `RASCUNHO`|`CONFIRMADO`|`EM_PRODUCAO`|`FATURADO`|`ENTREGUE`|`CANCELADO`, obrigatório) · `valor_total` (opcional) · `itens[]` (quando presente, não pode ser array vazio — cada item exige `descricao`, `quantidade` > 0, `preco_unitario` ≥ 0) · + envelope de origem.

### Contrato
`empresa_representada_id`, `titulo`, `status` (enum), `data_inicio` (obrigatórios) · `cliente_id`, `numero_contrato`, `data_fim`, `valor_mensal`, `valor_total` (opcionais) · regra cruzada: `data_fim` deve ser posterior a `data_inicio` · + envelope de origem.

### ContaReceber (Porta 1)
`empresa_representada_id`, `descricao`, `valor_original` (> 0), `data_vencimento` (obrigatórios) · `numero_documento`, `cliente_id`, `data_emissao`, `venda_id`, `venda_pagamento_id`, `venda_pagamento_parcela_id` (opcionais) · `status` (enum, default `PENDENTE`) · regra cruzada: `data_vencimento` não pode ser anterior a `data_emissao` · + envelope de origem (único que já persiste tudo hoje).

### Liquidação de Título (Porta 2)
`titulo_id`, `tipo_titulo` (`CONTAS_PAGAR`|`CONTAS_RECEBER`), `valor_pago` (> 0), `data_pagamento`, `forma_pagamento` (enum `DINHEIRO`|`TRANSFERENCIA`|`BOLETO`|`CARTAO_CREDITO`|`CARTAO_DEBITO`|`PIX`|`CHEQUE`|`DEPOSITO`) obrigatórios · `conta_bancaria_id`, `observacoes` opcionais · `multi_baixa[]` opcional (divide o pagamento entre contas bancárias) — regra cruzada: soma de `multi_baixa` deve bater com `valor_pago` · + envelope de origem. Tabela real: `liquidacoes_titulos`.

### Estoque — Movimentação (`estoque_movimentacoes`)
A entidade **mais crítica para um PDV**: toda venda de balcão precisa gerar uma saída de estoque correspondente (a tabela já tem `venda_id` para essa rastreabilidade nativa). `empresa_representada_id`, `produto_id`, `tipo` (enum `ENTRADA`|`SAIDA`|`TRANSFERENCIA`|`AJUSTE_POSITIVO`|`AJUSTE_NEGATIVO`|`INVENTARIO`), `quantidade` (> 0) obrigatórios · `custo_unitario`, `localizacao_origem_id`, `localizacao_destino_id`, `documento_ref`, `venda_id`, `observacoes` opcionais · regras cruzadas: `TRANSFERENCIA` exige origem e destino; `SAIDA`/`AJUSTE_NEGATIVO` exigem origem; `ENTRADA`/`AJUSTE_POSITIVO` exigem destino · + envelope de origem.

Tabelas relacionadas já mapeadas mas ainda **fora** do contrato canônico (Fase 3): `estoque_saldos` (view/cache de saldo, não deveria ser escrita diretamente por satélites — é derivada das movimentações) e `estoque_inventarios`/`estoque_inventario_itens` (contagem física, fluxo interno, menor prioridade para ingestão externa).

### Fiscal — natureza diferente (não é um contrato de ingestão)
`fiscal_documentos_eletronicos` (tabela real; NFe/NFCe emitidas) **não** é algo que um sistema satélite escreve — é gerado pelo próprio NOVUS via SEFAZ (edge functions `fiscal-emitir-nfe`/`fiscal-cancelar-nfe`/`fiscal-cce-nfe`) a partir de uma Venda já existente. Campos: `empresa_representada_id`, `venda_id`, `numero`, `serie`, `status`, `chave_acesso`, `protocolo_autorizacao`, `xml_url`, `danfe_url`, `pdf_danfe_url`, `data_emissao`, `valor_total`, `provider`, `ambiente`, `tentativas`.

Para um satélite como o PDV, a integração com Fiscal é de **leitura**, não de escrita: o PDV envia a Venda (Porta 1) e depois consulta `fiscal_documentos_eletronicos` (ou assina o realtime, já implementado em `useFiscalDocumentoRealtime`) para obter `danfe_url`/`pdf_danfe_url` e imprimir o cupom fiscal. Não faz sentido — e seria arriscado — expor este contrato como algo que satélites podem inserir/alterar diretamente; por isso ele **não** entra em `canonicalSchemas` como entidade de ingestão.

## 6. Porta 3 em detalhe — pré-checagem e autorização de exceção

Formato padrão de resposta (`supabase/functions/_shared/canonical/preflight.ts`):

```ts
{
  autorizado: boolean;
  bloqueios: Array<{
    codigo: string;              // ex.: "CLIENTE_INADIMPLENTE"
    motivo: string;              // texto para exibir ao operador
    pode_ser_superado: boolean;  // false = bloqueio duro, não há exceção possível
    permissao_necessaria?: string; // ex.: "vendas.autorizarInadimplencia"
  }>;
}
```

**Caso 1 — Estoque (já implementado):** `validar_saldo_estoque(p_produto, p_localizacao, p_quantidade)`. Hoje retorna `{ok, saldo_atual, quantidade_solicitada}` — formato mais simples que o padrão acima porque nasceu antes dele; migrar para o formato padrão (`bloqueios: [{codigo: 'SALDO_INSUFICIENTE', pode_ser_superado: false}]`) é candidato de limpeza futura, não bloqueante.

**Caso 2 — Crédito/inadimplência (implementado 2026-07-26):** RPC `verificar_autorizacao_venda(p_cliente_id, p_empresa_id, p_valor_pretendido)` (migração `20260726210000_porta3_credito_inadimplencia.sql`), cruzando `cliente_politica_pagamento` (status BLOQUEADO/EM_ANALISE, `limite_crediario`/`limite_utilizado`, `dias_max_atraso`) com títulos em `contas_receber` vencidos e não pagos (`status IN ('PENDENTE','PARCIAL','VENCIDO')` e `data_vencimento < CURRENT_DATE`). Retorna o formato padrão `preflightResponseSchema` com até 4 códigos de bloqueio: `CLIENTE_BLOQUEADO`, `CLIENTE_EM_ANALISE`, `CLIENTE_INADIMPLENTE`, `LIMITE_CREDIARIO_EXCEDIDO` — todos hoje `pode_ser_superado = true`, `permissao_necessaria = 'vendas.autorizarInadimplencia'` (nova permissão granular em `PermissionsSelector.tsx`, `critica: true`).

A exceção passa pela RPC `autorizar_excecao_venda(p_cliente_id, p_empresa_id, p_bloqueio_codigo, p_valor_pretendido, p_justificativa)`, que **reconfirma a permissão do usuário no servidor** via novo helper `has_permissao(user_id, permissao)` (nunca confia na alegação do satélite/cliente) e grava a exceção em `porta3_autorizacoes_excecao` (tabela de auditoria dedicada, mesmo padrão de `get_audit_trail`/`historico_*` já usado em Estoque e Gestão Bancária).

Cablado no NOVUS: `VendaFormModal.tsx` chama `verificar_autorizacao_venda` antes de salvar sempre que o plano de pagamento selecionado tem natureza `CREDIARIO_PROPRIO`; se bloqueado, abre `AutorizacaoExcecaoVendaDialog` (justificativa mín. 15 caracteres) que chama `autorizar_excecao_venda` e só então salva a venda. Client service: `src/services/porta3Service.ts`.

**Unificação parcial (2026-07-27, migração `20260727100000_unificar_inadimplencia_validar_pagamento.sql`):** o fluxo alternativo de conversão de orçamento em venda (`ConverterVendaDialog.tsx` → RPC `converter_orcamento_em_venda` → `validar_pagamento_venda`, validação pós-inserção com rollback via `RAISE EXCEPTION` se inválida, sem nenhum caminho de exceção/autorização) nunca checava títulos vencidos em `contas_receber` — um cliente inadimplente (mas com `cliente_politica_pagamento.status` ainda `ATIVO`) passava batido na conversão de orçamento para venda a prazo, mesmo sendo barrado pelo formulário direto. `validar_pagamento_venda` agora chama `verificar_autorizacao_venda` internamente e importa só o bloqueio `CLIENTE_INADIMPLENTE` para dentro de `erros` (escopo mínimo, decisão consciente): não duplica `CLIENTE_BLOQUEADO`/`LIMITE_CREDIARIO_EXCEDIDO` (já cobertos por `CLIENTE_BLOQUEADO`/`CREDIARIO_SEM_LIMITE` pré-existentes) nem transforma o aviso `CLIENTE_EM_ANALISE` em bloqueio nesse fluxo. **Gap que permanece, não resolvido nesta rodada**: `converter_orcamento_em_venda` continua sem nenhum caminho de exceção auditada — um bloqueio aqui é sempre terminal (usuário só pode cancelar e ajustar dados), diferente da Porta 3 no formulário direto, que permite superar com justificativa. Unificar UX/permissão de exceção nos dois fluxos seguiria sendo trabalho futuro, maior escopo, se algum dia for necessário.

Este padrão se generaliza para qualquer checagem futura do tipo "o satélite precisa saber algo que só o NOVUS sabe antes de agir" — reserva de horário, limite de vagas, disponibilidade de um bem locável (§8), etc.

## 7. Vínculo Usuário ↔ Pessoa (Colaborador / Sócio / Representante Legal)

Regra de negócio real e **já aplicada por constraint no banco** (`usuarios_pessoa_xor_chk`, migração `20260710232918`): todo registro em `public.usuarios` deve ter `pessoa_pendente = true` **ou** exatamente um vínculo consistente — `pessoa_tipo = 'COLABORADOR'` com `colaborador_id` preenchido (e `socio_id` nulo), **ou** `pessoa_tipo = 'SOCIO'` com `socio_id` preenchido (e `colaborador_id` nulo). `socios_representantes` cobre tanto Sócio quanto Representante Legal e Procurador via seu campo `tipo`.

Ou seja: **não existe usuário "solto"** no NOVUS — todo usuário representa uma pessoa física já cadastrada como colaborador ou sócio/representante da empresa representada. Isso vale tanto para criação via UI quanto, no futuro, para qualquer provisionamento de usuário disparado por um módulo satélite (ex.: um sistema escolar que precise criar acesso para um funcionário) — o satélite (ou seu adaptador, Fase 2) precisa resolver ou criar o Colaborador/Sócio correspondente **antes** de criar o Usuário, nunca pular essa etapa.

**Achado durante esta auditoria (2026-07-24):** a versão local de `NovoUsuarioModal.tsx` (parte das ~10 dias de edições não sincronizadas, ver histórico do commit `477d2b0`) tinha sido reduzida a um formulário simples de nome+e-mail que **não** definia `pessoa_tipo`/`colaborador_id`/`socio_id`/`pessoa_pendente` — violando a constraint acima em toda tentativa de criação de usuário. Corrigido no commit `7ef432d`, restaurando a versão real do histórico do GitHub.

Este contrato ainda não tem um schema Zod formal em `_shared/canonical/` (é aplicado hoje só pela constraint do banco + pela UI) — formalizá-lo como `usuarioCanonicalSchema` é candidato para a Fase 3.

## 8. Escopo do NOVUS ERP

Declarado explicitamente nesta revisão: o NOVUS pretende atender **qualquer negócio que não exija produção/transformação de insumo em produto acabado** (sem BOM, ordem de fabricação, ficha técnica de produção). Isso exclui restaurantes, laboratórios e fabricantes — não porque sejam impossíveis, mas porque fogem do núcleo (Cliente, Venda, Contrato, Título, Estoque) para um domínio de manufatura (MRP) que é um produto à parte.

Dentro do escopo, o núcleo atual (Cliente + Venda + Contrato + Título + Estoque) já cobre, sem precisar de tabela nova:

| Segmento | Como se encaixa |
|---|---|
| Varejo (loja de roupas, mercado) | Venda pontual + Estoque fungível (Porta 3 checa saldo antes de vender) |
| Escola | Contrato recorrente (mensalidade) para o financeiro + Venda pontual para produtos (uniforme, material) |
| Locadora de equipamentos | Contrato recorrente para o financeiro — mas falta rastrear **qual bem específico** está locado e quando volta (ver nota abaixo) |
| Oficina / prestação de serviço | Venda ou Contrato conforme pontual ou recorrente + Serviço como item |
| Crediário próprio | Título (Porta 1) + Liquidação (Porta 2) + checagem de inadimplência (Porta 3, §6) antes de nova venda |

**Gap real identificado (ainda não resolvido):** o `Estoque` atual (`estoque_movimentacoes`/`estoque_saldos`) modela quantidade fungível — bem consumido, não bem emprestado-e-devolvido. Uma locadora precisa saber qual unidade serializada específica está com qual cliente e a devolução esperada, não só uma contagem. `Contrato` hoje também não linka a nenhum item/bem. Fechar esse gap (um "Estoque de bem locável", com disponibilidade por unidade) é o requisito estrutural que falta para o núcleo cobrir locação de verdade — candidato a próxima investigação de fundo, fora do escopo desta revisão de contratos de ingestão.

## 9. Exemplo — mapeando um PDV para as portas 1, 2 e 3

Um PDV fala sua própria língua. Fluxo completo de uma venda de balcão, na ordem real de chamadas:

**1. Antes de vender (Porta 3):** para cada item do carrinho, `validar_saldo_estoque(produto_id, localizacao_id, quantidade)`. Se algum item não tiver saldo, o PDV bloqueia a venda daquele item antes de prosseguir.

**2. Payload do PDV** (formato hipotético, ilustrativo):

```json
{
  "cupom_numero": "CF-000482",
  "data_hora": "2026-07-24T14:32:00-03:00",
  "operador_caixa": "caixa-02",
  "total_liquido": 87.50,
  "forma_pagamento": "pix",
  "linhas": [
    { "sku": "REF-001", "qtd": 2, "valor_unit": 35.00 },
    { "sku": "REF-002", "qtd": 1, "valor_unit": 17.50 }
  ]
}
```

**3. O adaptador do PDV (Fase 2, ainda não implementado) emite três eventos, na ordem:**

Venda (Porta 1, `vendaCanonicalSchema`):
```json
{
  "empresa_representada_id": "<empresa do PDV>",
  "numero_venda": "CF-000482",
  "data_venda": "2026-07-24T14:32:00-03:00",
  "status": "FATURADO",
  "valor_total": 87.50,
  "origem_sistema": "pdv-loja-01",
  "origem_canal": "caixa-02",
  "idempotency_key": "pdv-loja-01:cupom:CF-000482",
  "itens": [
    { "descricao": "REF-001", "quantidade": 2, "preco_unitario": 35.00 },
    { "descricao": "REF-002", "quantidade": 1, "preco_unitario": 17.50 }
  ]
}
```

Movimentação de Estoque `SAIDA` por item (Porta 1, `estoqueMovimentacaoCanonicalSchema`), vinculada ao `venda_id` retornado acima — uma por linha do cupom.

Liquidação (Porta 2, `liquidacaoCanonicalSchema`), já que no PDV o pagamento acontece no mesmo instante da venda:
```json
{
  "titulo_id": "<conta_receber_id gerada a partir da venda>",
  "tipo_titulo": "CONTAS_RECEBER",
  "valor_pago": 87.50,
  "data_pagamento": "2026-07-24",
  "forma_pagamento": "PIX",
  "origem_sistema": "pdv-loja-01",
  "idempotency_key": "pdv-loja-01:cupom:CF-000482:liquidacao"
}
```

Cada payload passa pela validação (`data-validator`) antes de seguir para `sync-webhook`. Se o crediário estivesse envolvido em vez de PIX à vista, a Liquidação viria depois (ou nunca, até o cliente pagar) — e a próxima venda para o mesmo cliente passaria pela checagem de inadimplência (Porta 3, §6) antes de tudo.

## 10. Roadmap

1. **Fase 1 (concluída 2026-07-24):** contratos de ingestão formalizados como schemas Zod (`_shared/canonical/`) para 7 tabelas (`clientes`, `produtos`, `vendas`, `contratos`, `contas_receber`, `estoque_movimentacoes`, `liquidacoes_titulos`), `data-validator` reescrito para validar contra eles, testes Deno adicionados. Padrão de Porta 3 documentado e formatado (`preflight.ts`), com um caso já implementado (Estoque) e um desenhado (Crédito). Bug real corrigido em `NovoUsuarioModal.tsx` (vínculo Usuário↔Pessoa). Escopo do NOVUS declarado (§8), incluindo o gap de bem locável identificado e ainda não resolvido.
2. **Fase 1b:** migração estendendo o envelope de rastreabilidade para `clientes`, `produtos`, `contratos`, `estoque_movimentacoes` e `liquidacoes_titulos`, hoje sem essas colunas — para paridade com `contas_receber`.
3. **Fase 2:** camada de adaptadores por `source_system` — configurável (reaproveitando o padrão de "Regras de Classificação de Receita" já existente no app), traduzindo o formato de cada satélite para as três portas. Precisa cobrir eventos compostos (1 cupom de PDV → 1 Venda + N movimentações de Estoque + 1 Liquidação) e orquestrar a ordem de chamadas (Porta 3 antes, Portas 1/2 depois).
4. **Fase 3 (parcial — crédito/inadimplência concluído 2026-07-26, unificação parcial 2026-07-27):** `verificar_autorizacao_venda` + `autorizar_excecao_venda` implementados e cableados no NOVUS; gap de inadimplência não checada em `validar_pagamento_venda` fechado (ver §6). Ainda pendentes desta fase: formalizar `usuarioCanonicalSchema`; estender cobertura às tabelas restantes (ContasPagar, RH/Colaboradores); dar à conversão de orçamento (`converter_orcamento_em_venda`) o mesmo caminho de exceção auditada que o formulário direto já tem (gap conhecido, ver §6).
5. **Fase 4:** investigar e desenhar o "Estoque de bem locável" (§8) — disponibilidade por unidade serializada, ligação com `Contrato` — necessário antes de qualquer satélite de locação real.
6. **Fase 5:** observabilidade multi-origem no `SyncDashboard` — saúde e volume por `source_system`, não só por webhook.
