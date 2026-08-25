# NOVUS ERP — Plano Mestre (arquitetura, backlog e pendências)

> Documento único de "o que é verdade agora sobre arquitetura/pendências" — funde
> `docs/CONTRATOS_CANONICOS_ERP.md`, `docs/ROADMAP_2026.md` e `AUDITORIA_NOVA.md`
> (2026-08-19, pedido do usuário de consolidar documentação espalhada). Os três
> arquivos originais foram removidos daqui; o texto integral da auditoria (achados
> com `file:line`, antes da correção) fica arquivado em
> [`archive/AUDITORIA_NOVA_2026-08-15.md`](./archive/AUDITORIA_NOVA_2026-08-15.md)
> para consulta forense — a Parte 2 abaixo é um resumo já cruzado com o que foi
> corrigido, não o achado original.
>
> **O que NÃO está aqui:** checkpoint de sessão (o que aconteceu, quando, por quem)
> continua em [`STATUS.md`](./STATUS.md) — esse arquivo muda a cada sessão, este
> muda quando arquitetura ou backlog mudam de verdade.

---

# Parte 1 — Arquitetura de integração hub ↔ satélites

*(ex-`CONTRATOS_CANONICOS_ERP.md`, formalizado em 2026-07-24, ajustado ao que a
Auditoria de agosto/2026 confirmou ou corrigiu — ver Parte 2)*

## 1.1 Visão

O NOVUS ERP funciona como um **hub SaaS único**: o núcleo profissional que centraliza Vendas, Financeiro, Estoque, RH, Fiscal etc. de cada empresa representada. A visão de produto é conectar **módulos satélite** futuros — um PDV, um sistema de gestão escolar, uma locadora de equipamentos, e outros — que capturam dados na linguagem específica do seu domínio (ex.: PDV fala de "cupom" e "caixa"; um sistema escolar fala de "matrícula" e "mensalidade") e trocam dados com o NOVUS, onde são **traduzidos e padronizados** para a linguagem universal de um ERP profissional.

Esta parte formaliza essa linguagem universal: os **contratos canônicos** de cada entidade core, o **envelope de rastreabilidade** que identifica a origem de cada registro, o **padrão de pré-checagem/autorização** para a via de mão dupla, e o **escopo** de negócios que o NOVUS pretende atender.

## 1.2 As portas de integração

Um satélite não troca dados com o NOVUS de uma forma só. Existem quatro portas, com naturezas diferentes:

### Porta 0 — Provisionamento (push, NOVUS Centelha → satélite)
A única porta na direção inversa das outras três: o NOVUS (via Centelha, o controle de licenciamento de clientes) cria o tenant no satélite, não o satélite que se anuncia ao NOVUS. Acontece uma vez, quando um cliente novo assina — nunca em signup aberto. Contrato genérico, igual para qualquer satélite: o satélite expõe um endpoint `centelha-provisiona-organizacao` que recebe `{organization_name, empresa_representada_id, admin_nome, admin_email}` assinado por um segredo global (não por `webhook_configs`/config por-organização, que ainda não existe nesse ponto — é esse endpoint quem os cria), e devolve `{organization_id}`. Cria a organização/tenant local, o vínculo de integração com o ERP (`empresa_representada_id` já resolvido pelo Centelha) e convida o primeiro admin por e-mail. Um satélite novo (PDV, Clínica, Mercado...) ganha provisionamento pelo Centelha implementando só este endpoint — nenhuma mudança do lado NOVUS além de uma linha em `centelha.satelites`. Ver `supabase/functions/centelha-provisiona-cliente` (lado NOVUS) e o equivalente `centelha-provisiona-organizacao` em cada satélite.

### Porta 1 — Título (push, satélite → NOVUS)
O documento financeiro em si: descrição, valor, vencimento, forma de pagamento prevista, cliente. **Não importa o fator gerador** — uma mensalidade escolar, a venda de um uniforme, ou uma parcela de locação de equipamento chegam todas na mesma forma: um título em `contas_receber` (ou `contas_pagar`, no sentido inverso). O "gerador" (Venda, Contrato, ou o conceito que o satélite usa) é metadado opcional pendurado no título via o envelope de rastreabilidade (§1.4) — nunca um pré-requisito para o título existir. Contrato: `contaReceberCanonicalSchema` (§1.5).

### Porta 2 — Liquidação (push, satélite → NOVUS)
O evento "isso foi pago" — `titulo_id`, `valor_pago`, `data_pagamento`, `forma_pagamento`, opcionalmente dividido em múltiplas contas (`multi_baixa`). Desacoplado de como o título nasceu. `liquidacaoCanonicalSchema` (§1.5). Depois da liquidação, o dinheiro que efetivamente entrou é casado com o extrato bancário real pela conciliação bancária — isso é interno ao NOVUS, satélite nenhum precisa participar.

### Porta 3 — Consulta/Autorização (pull, satélite ↔ NOVUS, síncrona)
Diferente das duas primeiras, aqui o satélite **pergunta antes de agir localmente**, e o NOVUS responde com uma decisão, não só um dado. Dois exemplos reais que motivaram esta porta:

- **Estoque:** a entrada de estoque é operacionalizada no NOVUS (retaguarda), mas a venda acontece no PDV. Antes de vender, o PDV precisa perguntar "tem saldo?". **Implementado**: RPC `validar_saldo_estoque(produto_id, localizacao_id, quantidade)` → `{ok, saldo_atual, quantidade_solicitada}`.
- **Crédito/inadimplência:** uma loja de roupas com crediário próprio não pode vender pra um cliente com parcela vencida e não conciliada, a menos que um usuário com permissão específica autorize a exceção. **Implementado** (2026-07-26, unificação 2026-07-27) — ver §1.6.

Não é uma função por caso — é uma **categoria**: toda vez que um satélite precisa decidir algo que depende de estado que só o NOVUS conhece, a resposta segue o mesmo formato padrão (`preflightResponseSchema`, `supabase/functions/_shared/canonical/preflight.ts`): `{autorizado, bloqueios: [{codigo, motivo, pode_ser_superado, permissao_necessaria}]}`. Novos casos que surgirem (reserva de horário numa oficina, limite de vagas numa turma) devem seguir esse mesmo formato em vez de inventar uma resposta ad-hoc.

## 1.3 Peças já existentes que sustentam o modelo

- **`sync-webhook`** (edge function): receptor de dados de sistemas externos, com assinatura HMAC versionada (v1/v2, dual-signing), cabeçalho `x-source-system` (identifica a origem), `x-empresa-id` (tenant), proteção contra replay e reprocessamento por tentativa.
- **`Webhooks.tsx`** + `WebhookConfigModal`: configuração de integrações **de saída** (NOVUS → sistema externo) por empresa. Rota ganhou `AdminRoute` na Auditoria de agosto (Parte 2, Bloco 5) — secrets HMAC não são mais editáveis por qualquer funcionário.
- **FIN-E5**: rastreabilidade e idempotência no fluxo Venda → Conta a Receber (Porta 1). É aqui que nasceram os campos `origem_canal`, `origem_sistema`, `externo_id`, `idempotency_key`, `hash_payload`. `gerar_contas_receber_da_venda` implementa idempotência real via hash SHA-256 do payload.
- **`data-validator`** (edge function): validação de payloads de entrada.
- **`validar_saldo_estoque`** (RPC): Porta 3 para estoque, security-definer, checando `has_role_for_empresa`/`user_has_access_to_empresa`.
- **`ClientePoliticaPagamento`**: política de crédito por cliente (`status` ATIVO/BLOQUEADO/EM_ANALISE, `limite_crediario`, `limite_utilizado`, `dias_max_atraso`, `motivo_bloqueio`).
- **Permissões granulares com flag `critica`** (`PermissionsSelector.tsx`).

## 1.4 O envelope de rastreabilidade

Todo registro que **pode** ter sido originado por um sistema satélite carrega estes campos (todos opcionais — um registro criado direto na UI do NOVUS não tem sistema de origem):

| Campo | Tipo | Significado |
|---|---|---|
| `origem_sistema` | string | Identificador do sistema satélite que originou o dado (ex.: `pdv-loja-01`, `sistema-escolar-matriculas`). |
| `origem_canal` | string | Canal dentro do sistema de origem (ex.: `caixa-2`, `portal-matricula`). |
| `externo_id` | string | ID do registro no sistema de origem — permite correlacionar o registro do NOVUS com o registro original. |
| `idempotency_key` | string | Chave que identifica unicamente esta operação; reenvios com a mesma chave não duplicam o registro. |
| `hash_payload` | string | Hash (SHA-256) do payload normalizado; usado para detectar payloads divergentes reenviados sob a mesma chave. |

Definido em código: `supabase/functions/_shared/canonical/envelope.ts` (`origemEnvelopeSchema`).

**Estado de persistência por tabela:**

| Tabela | Envelope no banco? |
|---|---|
| `contas_receber` | ✅ completo (`venda_id`, `venda_pagamento_id`, `venda_pagamento_parcela_id` inclusos) |
| `vendas` | 🟡 parcial (só `hash_payload`) |
| `venda_pagamento` | 🟡 parcial (`origem_canal`, `origem_sistema`) |
| `venda_pagamento_parcelas` | 🟡 parcial (`externo_id`) |
| `clientes`, `produtos`, `contratos`, `estoque_movimentacoes`, `liquidacoes_titulos` | ❌ nenhum — Fase 1b (§1.9) |

## 1.5 Contratos por entidade

Fonte de verdade em código: `supabase/functions/_shared/canonical/entities.ts`. Os schemas Zod ali são a implementação executável — em caso de divergência, **o código manda**; atualize este documento para acompanhar, não o contrário.

Cada entidade tem dois schemas exportados: `<entidade>CanonicalObjectSchema` (schema-objeto puro, usado com `.partial()` para updates parciais) e `<entidade>CanonicalSchema` (schema completo com regras cruzadas, usado para inserts).

- **Cliente**: `empresa_representada_id`, `nome`, `tipo` (`F`|`J`) obrigatórios · `apelido`, `email`, `telefone` opcionais · `cpf_cnpj` validado por dígito verificador real · `ativo` (default `true`) · + envelope.
- **Produto**: `empresa_representada_id`, `nome`, `preco_venda` (≥0) obrigatórios · `codigo`, `categoria_id`, `preco_custo`, `ncm`, `estoque_atual`, `estoque_minimo`, `controla_estoque`, `ativo` opcionais · + envelope.
- **Venda (+ Itens)**: `empresa_representada_id`, `data_venda`, `status` (enum) obrigatórios · `cliente_id`, `numero_venda`, `valor_total` opcionais · `itens[]` (quando presente, não vazio; cada item exige `descricao`, `quantidade`>0, `preco_unitario`≥0) · + envelope.
- **Contrato**: `empresa_representada_id`, `titulo`, `status`, `data_inicio` obrigatórios · `cliente_id`, `numero_contrato`, `data_fim`, `valor_mensal`, `valor_total` opcionais · regra cruzada: `data_fim` > `data_inicio` · + envelope.
- **ContaReceber (Porta 1)**: `empresa_representada_id`, `descricao`, `valor_original` (>0), `data_vencimento` obrigatórios · `numero_documento`, `cliente_id`, `data_emissao`, `venda_id`, `venda_pagamento_id`, `venda_pagamento_parcela_id` opcionais · `status` (default `PENDENTE`) · regra cruzada: `data_vencimento` ≥ `data_emissao` · + envelope (único que já persiste tudo hoje).
- **Liquidação de Título (Porta 2)**: `titulo_id`, `tipo_titulo`, `valor_pago` (>0), `data_pagamento`, `forma_pagamento` obrigatórios · `conta_bancaria_id`, `observacoes`, `multi_baixa[]` opcionais (soma deve bater com `valor_pago`) · + envelope. Tabela real: `liquidacoes_titulos`.
- **Estoque — Movimentação** (`estoque_movimentacoes`): a entidade **mais crítica para um PDV** (tabela já tem `venda_id` para rastreabilidade nativa). `empresa_representada_id`, `produto_id`, `tipo` (enum), `quantidade` (>0) obrigatórios · `custo_unitario`, `localizacao_origem_id`, `localizacao_destino_id`, `documento_ref`, `venda_id`, `observacoes` opcionais · regras cruzadas por `tipo` (transferência exige origem+destino; saída exige origem; entrada exige destino) · + envelope.
  Fora do contrato canônico ainda (Fase 3, §1.9): `estoque_saldos` (view/cache derivada, não deve ser escrita direto) e `estoque_inventarios`/`itens` (contagem física, fluxo interno).
- **Fiscal — natureza diferente (não é contrato de ingestão)**: `fiscal_documentos_eletronicos` **não** é algo que um satélite escreve — é gerado pelo próprio NOVUS via SEFAZ a partir de uma Venda já existente. Para um satélite como o PDV, a integração é de **leitura** (`useFiscalDocumentoRealtime`) para obter `danfe_url`/`pdf_danfe_url`.

## 1.6 Porta 3 em detalhe — pré-checagem e autorização de exceção

Formato padrão de resposta (`supabase/functions/_shared/canonical/preflight.ts`):

```ts
{
  autorizado: boolean;
  bloqueios: Array<{
    codigo: string;              // ex.: "CLIENTE_INADIMPLENTE"
    motivo: string;              // texto para exibir ao operador
    pode_ser_superado: boolean;  // false = bloqueio duro
    permissao_necessaria?: string; // ex.: "vendas.autorizarInadimplencia"
  }>;
}
```

**Caso 1 — Estoque:** `validar_saldo_estoque(p_produto, p_localizacao, p_quantidade)`. Retorna `{ok, saldo_atual, quantidade_solicitada}` — formato mais simples que o padrão acima porque nasceu antes dele; migrar para o formato padrão é candidato de limpeza futura, não bloqueante.

**Caso 2 — Crédito/inadimplência:** RPC `verificar_autorizacao_venda(p_cliente_id, p_empresa_id, p_valor_pretendido)`, cruzando `cliente_politica_pagamento` com títulos vencidos em `contas_receber`. Retorna `preflightResponseSchema` com até 4 códigos: `CLIENTE_BLOQUEADO`, `CLIENTE_EM_ANALISE`, `CLIENTE_INADIMPLENTE`, `LIMITE_CREDIARIO_EXCEDIDO` — todos `pode_ser_superado=true`, `permissao_necessaria='vendas.autorizarInadimplencia'`.

A exceção passa por `autorizar_excecao_venda(...)`, que **reconfirma a permissão do usuário no servidor** via `has_permissao(user_id, permissao)` (nunca confia na alegação do satélite/cliente) e grava em `porta3_autorizacoes_excecao` (auditoria dedicada).

Cablado no NOVUS: `VendaFormModal.tsx` chama `verificar_autorizacao_venda` antes de salvar quando o plano tem natureza `CREDIARIO_PROPRIO`; se bloqueado, abre `AutorizacaoExcecaoVendaDialog`. Client service: `src/services/porta3Service.ts`.

`validar_pagamento_venda` (usado por `converter_orcamento_em_venda`) também chama `verificar_autorizacao_venda` internamente, importando o bloqueio `CLIENTE_INADIMPLENTE`. **Gap que permanece**: `converter_orcamento_em_venda` não tem caminho de exceção auditada — um bloqueio ali é sempre terminal, diferente do formulário direto. Unificar UX/permissão nos dois fluxos é trabalho futuro, sem urgência registrada.

Este padrão se generaliza para qualquer checagem futura do tipo "o satélite precisa saber algo que só o NOVUS sabe antes de agir" — reserva de horário, limite de vagas, disponibilidade de um bem locável (§1.8), etc.

## 1.7 Vínculo Usuário ↔ Pessoa (Colaborador / Sócio / Representante Legal)

Regra de negócio real e aplicada por constraint no banco (`usuarios_pessoa_xor_chk`): todo registro em `public.usuarios` deve ter `pessoa_pendente=true` **ou** exatamente um vínculo consistente — `pessoa_tipo='COLABORADOR'` com `colaborador_id` (e `socio_id` nulo), **ou** `pessoa_tipo='SOCIO'` com `socio_id` (e `colaborador_id` nulo). `socios_representantes` cobre Sócio, Representante Legal e Procurador via seu campo `tipo`.

Não existe usuário "solto" no NOVUS — todo usuário representa uma pessoa física já cadastrada como colaborador ou sócio/representante. Vale tanto para criação via UI quanto para qualquer provisionamento disparado por um satélite: o satélite (ou seu adaptador) precisa resolver ou criar o Colaborador/Sócio correspondente **antes** de criar o Usuário.

Este contrato ainda não tem schema Zod formal em `_shared/canonical/` — formalizá-lo como `usuarioCanonicalSchema` é candidato de backlog (Parte 3).

## 1.8 Escopo do NOVUS ERP

O NOVUS pretende atender **qualquer negócio que não exija produção/transformação de insumo em produto acabado** (sem BOM, ordem de fabricação, ficha técnica de produção) — exclui restaurantes, laboratórios e fabricantes, não por impossibilidade, mas por fugir do núcleo (Cliente, Venda, Contrato, Título, Estoque) para um domínio de manufatura (MRP) que é produto à parte.

| Segmento | Como se encaixa |
|---|---|
| Varejo (loja de roupas, mercado) | Venda pontual + Estoque fungível (Porta 3 checa saldo) |
| Escola | Contrato recorrente (mensalidade) + Venda pontual (uniforme, material) |
| Locadora de equipamentos | Contrato recorrente — mas falta rastrear **qual bem específico** está locado (gap abaixo) |
| Oficina / prestação de serviço | Venda ou Contrato + Serviço como item |
| Crediário próprio | Título + Liquidação + checagem de inadimplência (§1.6) |

**Gap real, ainda não resolvido:** `Estoque` (`estoque_movimentacoes`/`estoque_saldos`) modela quantidade fungível, não bem emprestado-e-devolvido. Uma locadora precisa saber qual unidade serializada está com qual cliente e a devolução esperada. `Contrato` hoje não linka a nenhum item/bem. Fechar esse gap ("Estoque de bem locável") é requisito estrutural para locação de verdade — candidato de investigação de fundo, sem satélite real que o exija ainda.

## 1.9 Roadmap da integração

1. **Concluído (2026-07-24):** contratos de ingestão formalizados (7 tabelas), `data-validator` validando contra eles, Porta 3 documentada e formatada, um caso implementado (Estoque). Escopo do NOVUS declarado (§1.8).
2. **Fase 1b (não iniciada):** estender o envelope de rastreabilidade a `clientes`, `produtos`, `contratos`, `estoque_movimentacoes`, `liquidacoes_titulos` — paridade com `contas_receber`.
3. **Fase 2 (não iniciada):** camada de adaptadores por `source_system`, traduzindo o formato de cada satélite para as três portas. Precisa cobrir eventos compostos (1 cupom de PDV → 1 Venda + N movimentações de Estoque + 1 Liquidação).
4. **Fase 3 (concluída em 2026-07-26/27 para crédito/inadimplência):** `verificar_autorizacao_venda`+`autorizar_excecao_venda` cableados. Pendente: formalizar `usuarioCanonicalSchema`; estender cobertura a ContasPagar/RH; dar a `converter_orcamento_em_venda` caminho de exceção auditada (gap §1.6).
5. **Fase 4 (não iniciada):** desenhar "Estoque de bem locável" (§1.8).
6. **Fase 5 (não iniciada):** observabilidade multi-origem no `SyncDashboard` — saúde/volume por `source_system`, não só por webhook.

## 1.10 Dois cenários de uso e pilares técnicos para maturidade de integração

- **Cenário 1 — Operação direta (pequeno negócio):** lojinha, oficina, conveniência. O NOVUS é a **única** ferramenta de gestão. Prioridade: usabilidade e simplicidade.
- **Cenário 2 — Pseudo-backend para satélites** (Novus Educacional e outros futuros): o NOVUS é o "cérebro" financeiro/de recursos, processando transações de sistemas especializados externos. Prioridade: integração, flexibilidade, segurança, resiliência.

O mesmo núcleo (§1.5) atende aos dois — a diferença é só **quem opera a UI diretamente** vs. **quem envia dados via as três portas**. Nenhuma tabela ou fluxo deve ser exclusivo de um cenário.

**Pilares técnicos — estado real (checado contra o código, não aspiracional):**

| Pilar | Estado | Onde / o que falta |
|---|---|---|
| APIs REST para ingestão | ✅ existe | Edge functions (`sync-webhook`, `data-validator`) + RPCs SECURITY DEFINER — padrão do projeto, não Express/Fastify tradicional. |
| Webhooks **de saída** (NOVUS → satélite) | 🟡 parcial | `Webhooks.tsx`/config por empresa existe, mas não há catálogo formal de eventos nem disparo automático (`novo_cliente_cadastrado`, `pagamento_recebido_contrato_Y` etc.) — infra de configuração sem os gatilhos de negócio pendurados. |
| Idempotência | ✅ existe | `idempotency_key`/`hash_payload` no envelope (§1.4), implementado em `gerar_contas_receber_da_venda`, `converter_orcamento_em_venda`, `criarPagamentoComParcelas`. |
| Permissões granulares / IAM interno | ✅ existe | `has_role_for_empresa` + `has_permissao` (granular via `perfis_acesso.permissoes`) + RLS por `empresa_representada_id`. Só ~1 de 70 permissões granulares é de fato checada hoje (ver Parte 3, backlog de manutenção). |
| IAM para parceiros externos (OAuth2/OIDC) | ❌ não existe | Autenticação de satélite é via HMAC por empresa. Suficiente para o volume atual; decisão a tomar quando houver satélite real que exija delegação mais fina, não antes. |
| Modelo de dados flexível (custom fields) | ❌ não existe | Nenhuma entidade core aceita campo customizado por tenant — schema fixo. Decisão de arquitetura (`jsonb` genérico vs. EAV) a tomar com o usuário quando houver caso real, não migração especulativa. |
| Motor de regras de negócio configurável | 🟡 embrionário | Padrão mais próximo: "Regras de Classificação de Receita" (base a reaproveitar para adaptadores por `source_system`, Fase 2 acima). Sem motor genérico de alçada/preço/comissionamento. |
| Logging/auditoria | ✅ existe (interno) | `historico_*` (Estoque, Gestão Bancária, Porta 3, e agora Colaboradores/Cargo — Parte 2) + `get_audit_trail`. Não cobre monitoramento de saúde por integração de satélite além do `SyncDashboard` por webhook (item 6 do roadmap acima). |
| Retentativa automática (retry) | ❌ não existe | Falha de entrega de webhook de saída sem retry documentado — fechar junto do catálogo de eventos. |
| Filas de mensagens (RabbitMQ/Kafka) | ❌ não existe, decisão grande | Stack roda hoje em Supabase (Postgres + Edge Functions serverless). Não iniciar sem decisão explícita do usuário e volume real que justifique. |
| CRM básico (histórico/fidelidade de cliente) | ❌ não existe | Tela de venda não mostra histórico de compras/ticket médio. Cliente já é fonte única da verdade — falta só a consulta agregada. |
| Estoque sincronizado em tempo real | ✅ boa forma | `validar_saldo_estoque` + `baixar_estoque_venda`/`estornar_estoque_venda` + sincronismo `produtos.estoque_atual` ↔ `estoque_saldos`. |
| Fiscal a partir de qualquer origem | ✅ existe | Sempre gerado pelo NOVUS a partir de uma Venda já existente, não importa a origem. |
| Financeiro integrado | ✅ existe | Arquitetura de Portas 1/2 (§1.2) — não depende de origem. |

A maior parte dos pilares "faltantes" não são lacunas desconhecidas — são decisões de infraestrutura (fila de mensagens, OAuth2 externo, custom fields) que exigem alinhamento explícito com o usuário antes de começar. Os dois mais "baratos" de avançar sem grande decisão de arquitetura: catálogo de eventos de webhook de saída (infra já existe) e motor de comissionamento básico (resolve dois problemas com uma peça só — ver Parte 3).

---

# Parte 2 — Auditoria de agosto/2026: achados e resolução

*(ex-`AUDITORIA_NOVA.md`. Levantamento em 2026-08-15/16 contra código real (85 rotas,
78 services, 654 arquivos TS/TSX) e banco real (`reksodqzemboaeqxnxyy`, advisors +
diff de policies/RPCs). Achados originais com `file:line` completo:
[`archive/AUDITORIA_NOVA_2026-08-15.md`](./archive/AUDITORIA_NOVA_2026-08-15.md).
Este resumo já cruza cada achado com o que foi corrigido depois — ver `STATUS.md`
para o detalhe sessão a sessão de cada correção.)*

**Snapshot no momento da auditoria (2026-08-15/16, antes de qualquer correção):**
typecheck limpo, 383 testes, ~71.400 linhas/654 arquivos, 85 rotas, 52 itens de
sidebar, 78 services (9 com teste), 238 componentes fora de `ui/` (21 com teste),
151 migrations, 29 edge functions, 682 `console.*` fora de `ui/` (89 arquivos), 16
arquivos com acesso direto ao Supabase fora de `services/`, 48 ocorrências de `: any`.
**Conclusão central da auditoria:** os portões verdes (typecheck/testes/build)
escondiam o problema real — banco desalinhado das migrations, botões sem handler,
features construídas mas nunca conectadas a rota/menu/`onSave`.

## 2.1 Blocos de achado × resolução

| Bloco | Achado (2026-08-15/16) | Resolução | Fase |
|---|---|---|---|
| 1.1 | Conciliação bancária: 5 tabelas com RLS habilitada e **zero policies** — módulo mais bem escrito do sistema, inoperante para o usuário final | 14 policies recriadas (migration aditiva) | Fase 1 ✅ |
| 1.2 | Buckets de Storage fiscais (`fiscal-xml`/`fiscal-danfe`/`fiscal-certificados`) não existiam no projeto real | Buckets criados com policy por empresa | Fase 1 ✅ |
| 1.3 | 331 policies com `auth.uid()` reavaliado por linha (`auth_rls_initplan`) — bloqueador de escala | 345 policies (cresceu com Fases 1.5/6) migradas para `(select auth.uid())`, sweep mecânico via `pg_policies`; advisor zerou o aviso | Fase 5 ✅ |
| 1.4 | 44 funções `SECURITY DEFINER` com `EXECUTE` a `anon`; 4 com `search_path` mutável; leaked-password-check desligado | `EXECUTE` retirado de `anon`, `search_path` fixado | Fase 1 ✅ |
| 1.5 | `has_role()` não filtra empresa — ~146 policies deixavam `admin` de uma empresa ler/escrever dados de outra; auto-promoção a admin sem gate | Decisão do usuário: `admin` restrito à própria empresa; 288 policies migradas para `has_role_for_empresa`; edge function `enviar-convite-usuario` corrigida (mesmo bug, achado fora do escopo original) | Fase 1.5 ✅ |
| 1.6 | `sync_logs` sem `empresa_representada_id`, RLS `USING (true)` — vazamento cross-tenant de logs | Corrigido junto da Fase 1.5 (mesmo padrão de escopo) | Fase 1.5 ✅ |
| 2 | Upload de documento financeiro simulado (URL fake); `ContasPagar.handleSubmit` fechava modal antes da mutation terminar; Naturezas de Operação e Tributos (alíquotas) 100% decorativos | Bucket real `financeiro-documentos`; `handleSubmit` corrigido; CRUD real dos dois cadastros fiscais | Fase 2 ✅ |
| 3 | `GerarTitulosButton` (marcado OK na auditoria original) nunca gerou título em produção; `RegrasClassificacaoReceita` órfã; botões mortos em Movimentações Bancárias; filtro de período do Fluxo de Caixa sem efeito | Ambos conectados (não apagados — alimentam `trg_snapshot_class_venda`); botões e filtro implementados de verdade | Fase 3 ✅ |
| 4 | Feature flags só escondiam item de menu, nunca protegiam a rota — `/estoque/inventario` etc. abriam por URL direta para qualquer usuário | `FeatureRoute.tsx` (padrão `AdminRoute`) aplicado nas 7 rotas afetadas; `Sistema.tsx` (fachada total) removido | Fase 4 ✅ |
| 5 | Só 4 de 85 rotas gated, todas dependentes do `has_role` ambíguo do Bloco 1.5; `/configuracoes/webhooks` (secrets HMAC) e `/rh/folha/folha-pagamento` (salário de colega) abertas a qualquer funcionário autenticado, inclusive **escrita**, não só leitura | `webhook_configs`/`folha_pagamento` viraram admin-only nas 4 operações de RLS; rotas ganharam `AdminRoute`; bônus: token da Integração de Ponto parou de trafegar em texto puro | Fase 6 ✅ |
| 4 (escala) | 66 de 78 services sem paginação — toda lista central carrega a empresa inteira no navegador | Paginação server-side nas 6 listas de maior volume (Contas a Pagar/Receber, Mov. Bancárias, Vendas, Entidades, Produtos) + agregação Postgres no Fluxo de Caixa. **Relatórios financeiro/vendas ficaram de fora por decisão do usuário** (baixa urgência, base de produção ainda pequena) — pendência explícita, não perdida (Parte 4) | Fase 5 ✅ (parcial por decisão) |
| RH | Folha de Pagamento sem motor de cálculo (digitação manual); Registros de Ponto sem via de entrada; Integração de Ponto configura e nunca executa | 3 decisões de produto tomadas (Parte 4) + tratamento honesto de UI (padrão SPED) nas 3 telas | Fase 6.5 ✅ |

## 2.2 O que a auditoria confirmou como correto (não é achado)

Todas as 36 RPCs chamadas pelo código existem de fato no banco; todas as 83 tabelas/views referenciadas existem (a única referência a uma tabela inexistente estava dentro de um comentário morto, não em código executável). O Kardex (`/estoque/kardex/:produtoId`) já era, desde antes da auditoria, o único módulo com paginação server-side completa — virou a referência de padrão copiada na Fase 5.

## 2.3 Итого — nada do "TOP 20 defeitos" original segue aberto por bug

Todos os 20 itens do ranking original de gravidade da auditoria (isolamento multi-tenant, auto-escalação a admin, conciliação inoperante, upload simulado, `FISCAL_MOCK`, folha sem motor, tributos decorativos, RLS sem escala, RPCs abertas a `anon`, paginação, órfãos, botões mortos, baixa de estoque na localização errada etc.) foram fechados pelas Fases 1 a 6.5 — detalhe completo por item no arquivo original arquivado. As únicas exceções são decisões de produto conscientes, não bugs esquecidos: Relatórios financeiro/vendas sem agregação Postgres (Fase 5, adiado por baixa urgência) e o motor de cálculo de Folha (Fase 6.5, decidido mas não implementado — ver Parte 4).

---

# Parte 3 — Backlog priorizado

*(ex-`ROADMAP_2026.md`. Fonte de verdade do que falta no ERP. Uma fase só avança
quando seus critérios de saída estão comprovados.)*

## Regras de execução e continuidade

- Cada entrega deve caber em um checkpoint verificável e deixar o sistema executável.
- Nenhuma operação financeira composta pode depender de compensação manual entre chamadas.
- Alterações de schema/RLS/constraints exigem validação contra o banco real antes da migration.
- Ao pausar, atualizar o topo de `STATUS.md` com: concluído, pendente, arquivos, validações, riscos e **próxima ação única**.
- Documentação e checkpoints são agnósticos de ferramenta: não citar fornecedor, marca, assistente ou ambiente pessoal; registrar apenas evidência técnica reproduzível no repositório.
- Marcação: `[ ]` pendente, `[~]` em execução, `[x]` concluído, `[!]` bloqueado.
- Itens deste programa são indispensáveis; podem ser reordenados por dependência, não removidos sem decisão explícita registrada.

## Programa Financeiro Robusto

Objetivo: servir desde operação simples de caixa até grupo econômico multiempresa/multifilial, sem expor complexidade corporativa para quem não precisa dela.

### FIN-0 — Integridade e segurança transacional
**Estado:** `[x]` concluída em 2026-08-11. RPCs transacionais/idempotentes de liquidar, estornar e cancelar título; baixa parcial real; permissões financeiras aplicadas na UI/serviço/RLS; exclusão física bloqueada; isolamento entre empresas provado.

### FIN-1 — Completar fluxos atualmente parciais ou apenas visuais
**Prioridade atual.**
- [~] Submodal de cancelamento (implementado, aguardando validação visual local).
- [~] Submodal de estorno (seleção/motivo/conta concluídos; data contábil manual pendente).
- [x] Submodal de baixa parcial com juros, multa, desconto e saldo posterior.
- [x] Divisão da baixa entre múltiplas contas/meios de pagamento.
- [ ] Renegociação: substituir título por novas parcelas preservando rastreabilidade.
- [x] Gestão de rateios de pagar e receber no detalhe do título.
- [ ] Vincular uma movimentação bancária existente ou criar e conciliar uma nova.
- [ ] Cadastro rápido de entidade nos consumidores financeiros usando o cadastro central.
- [ ] Aplicar filtros já declarados de conta bancária e usuário.
- [ ] Corrigir upload/remoção de documentos para aguardar conclusão real da mutation.
- [ ] Operações em lote com revisão antes de executar.
- [ ] Testes E2E: criar, editar, liquidar parcial/total, cancelar, estornar e conciliar.

**Critério de saída:** nenhum botão financeiro termina em "em breve", no-op ou toast fictício.

### FIN-2 — Workspace financeiro e escala básica
- [ ] Transformar `/financeiro/movimentacoes` em página de trabalho; modal só para ação curta.
- [ ] Painel lateral de detalhe com histórico, documentos, rateios e conciliação.
- [x] Paginação, busca, filtros e ordenação server-side em listas financeiras — **6 listas de maior volume fechadas na Auditoria de agosto/Fase 5** (Parte 2); Relatórios financeiro/vendas ainda somam no navegador (pendência explícita, Parte 4).
- [x] Indicadores e agrupamentos calculados no PostgreSQL — **Fluxo de Caixa fechado na Fase 5**; Relatórios financeiro/vendas pendentes (mesma pendência acima).
- [ ] Estados acessíveis de loading, erro e vazio; navegação por teclado e foco em diálogos.
- [ ] Visões salvas, filtros persistentes e exportação do conjunto filtrado.
- [ ] Relatórios grandes assíncronos; limites e avisos claros de volume.

**Critério de saída:** listas permanecem utilizáveis com pelo menos 1 milhão de títulos no tenant de benchmark sem carregar o conjunto completo no cliente.

### FIN-3 — Pequeno negócio e caixa diário
- [ ] Onboarding financeiro simplificado com plano de contas e categorias padrão.
- [ ] Modo simples que oculta dimensões avançadas sem removê-las do modelo.
- [ ] Abertura e fechamento de caixa por operador/turno.
- [ ] Sangria, suprimento, conferência e diferença esperado × contado.
- [ ] Visão diária: entradas, saídas, saldo, vencimentos e atrasos.
- [ ] Recorrências monitoradas, com falhas e próxima geração visíveis.
- [ ] Lembretes de cobrança e comprovantes pelo celular.
- [ ] Cobrança Pix/boleto/link por adaptador de PSP autorizado.
- [ ] Importação OFX/CSV com mapeamento assistido e prevenção de duplicidade.

**Critério de saída:** uma empresa de caixa único consegue operar sem configurar contabilidade, filiais ou workflow corporativo manualmente.

### FIN-4 — Subledger e contabilidade por partidas dobradas
- [ ] Livro imutável de lançamentos e linhas débito/crédito balanceadas.
- [ ] Regras de contabilização para títulos, liquidações, tarifas, transferências e estornos.
- [ ] Períodos contábeis, fechamento, reabertura autorizada e lançamento retroativo auditado.
- [ ] Plano de contas versionado e mapeamento referencial.
- [ ] Livro diário, razão, balancete, DRE e balanço derivados do mesmo livro.
- [ ] Trilhas para ECD/ECF/SPED sem misturar regra fiscal ao núcleo financeiro.
- [ ] Reconciliação entre subledgers de pagar/receber/bancos e razão geral.

**Critério de saída:** todo evento financeiro contabilizado produz débito = crédito e só pode ser corrigido por lançamento reverso auditável.

### FIN-5 — Grupo econômico, multiempresa e multifilial
- [ ] Modelar grupo econômico → empresa legal → estabelecimento matriz/filial.
- [ ] Separar estabelecimento, unidade de negócio, centro de custo, projeto e canal.
- [ ] Escopo do usuário por grupo/empresa/filial, aplicado também nas RPCs e relatórios.
- [ ] Dimensões obrigatórias/configuráveis por empresa e tipo de lançamento.
- [ ] Tesouraria e contas a pagar centralizadas com operação local controlada.
- [ ] Workflow de aprovação por valor, categoria, filial e centro de custo.
- [ ] Segregação solicitante × aprovador × pagador e substituição temporária auditada.
- [ ] Orçamento, realizado e compromissado por dimensão.
- [ ] Operações intercompany, contas recíprocas e eliminações.
- [ ] Relatórios isolados e consolidados por qualquer nível da hierarquia.

**Critério de saída:** grupo com várias empresas e filiais fecha e consolida sem compartilhar dados com usuários fora do escopo nem usar centro de custo como filial.

### FIN-6 — Multimoeda e operação internacional
- [ ] Moeda funcional por empresa, moeda da transação e moeda de apresentação.
- [ ] Taxa, data, fonte e política de câmbio rastreáveis.
- [ ] Ganhos/perdas cambiais realizados e não realizados.
- [ ] Consolidação com conversão e eliminações intragrupo.
- [ ] Calendário, timezone e período fiscal por jurisdição.
- [ ] Adaptadores fiscais por país desacoplados do subledger.

**Critério de saída:** transações e consolidação multimoeda são reproduzíveis a partir das taxas registradas, sem sobrescrever o valor original.

### FIN-7 — Integrações financeiras e automação
- [ ] Inbox/outbox transacional, retry com backoff, fila de falhas e replay auditado.
- [ ] Idempotência obrigatória nas Portas Título, Liquidação e Autorização.
- [ ] CNAB 240 para remessa/retorno conforme provedores priorizados.
- [ ] Open Finance para contas, saldos e transações via integração autorizada.
- [ ] Adaptadores Pix, boleto, adquirentes e gateways sem acoplar o domínio ao provedor.
- [ ] Modelo canônico compatível com conceitos de cash management/ISO 20022.
- [ ] Observabilidade por origem: volume, latência, erro, duplicidade e atraso.

**Critério de saída:** qualquer evento externo pode ser reprocessado com segurança e sua origem é rastreável até o lançamento financeiro/contábil resultante.

### FIN-8 — Operação, segurança e conformidade contínua
- [ ] Baseline OWASP ASVS 5.0 para autenticação, autorização, validação e auditoria.
- [ ] MFA/step-up para ações críticas configuráveis.
- [ ] Alertas de alteração bancária, pagamento duplicado e comportamento anômalo.
- [ ] Logs sem segredos ou dados pessoais/financeiros desnecessários.
- [ ] SLOs para baixa, conciliação, jobs e integrações; alertas acionáveis.
- [ ] Backup, restauração e disaster recovery testados periodicamente.
- [ ] Testes de propriedade para dinheiro, concorrência, isolamento e invariantes contábeis.
- [ ] Particionamento/arquivamento apenas guiado por medição.

**Critério de saída:** controles, recuperação e auditoria são comprovados por exercício, não apenas por configuração declarada.

## Demais frentes indispensáveis do ERP

### Integração hub ↔ satélites
- [ ] Completar envelope canônico onde ainda faltar, validando consumidores reais (Parte 1, §1.9 Fase 1b).
- [ ] Catálogo de eventos e webhook de saída para fatos de negócio (Parte 1, §1.10).
- [ ] Adaptador do Educacional como primeiro caso real; não criar adaptador genérico especulativo (Parte 1, §1.9 Fase 2).
- [ ] Dashboard por `source_system` com volume, erro, latência e replay (Parte 1, §1.9 Fase 5).
- [x] Manter contrato de 3 portas e HMAC como padrão obrigatório — vigente, sem desvio registrado.

### Comercial e operação de balcão
- [ ] Comissionamento por vendedor/período, seguido de regras por categoria quando necessário.
- [ ] Fluxo rápido/balcão dentro de Vendas, reutilizando venda/pagamento/estoque existentes.
- [ ] Desconto percentual com alçada e auditoria.
- [ ] NFC-e e evolução fiscal comprovada em homologação real.

### Fiscal, RH e estoque especializado
- [ ] Fiscal completo: NFC-e, CCe, contingência e consulta de status.
- [ ] Folha real (motor interno — decisão tomada na Fase 6.5, Parte 4) ou integração homologada.
- [ ] Bem locável/serializado separado do estoque fungível antes do satélite de locação (Parte 1, §1.8).
- [ ] Custom fields somente após caso real; preferir `metadata jsonb` antes de EAV, salvo prova contrária.

### Manutenção transversal (= Fase 7 da Auditoria de agosto, Parte 4)
- [ ] Remover chamadas Supabase de componentes/hooks e respeitar `src/services/**` — **16 arquivos** identificados na Auditoria de agosto ainda pendentes.
- [ ] Eliminar logs de debug e `any` por área, mantendo gates verdes — **682 `console.*`/48 `: any`** no snapshot da auditoria, ainda não podados.
- [x] Manter rotas canônicas, estados vazios úteis e seletores escaláveis — **fechado pelas Fases 2-5** da Auditoria de agosto (Parte 2).
- [x] Revisar RLS, UNIQUE/onConflict, CHECKs e FKs no banco real em cada frente — **fechado pelas Fases 1/1.5/6** da Auditoria de agosto (Parte 2).

## Sequência executiva atual

FIN-0 concluída em 2026-08-11. Auditoria de agosto/2026 (Fases 1-6.5) concluída em
2026-08-19 (Parte 2). Ordem recomendada a partir de agora:

1. **FIN-1:** renegociação de título, substituindo um título por novas parcelas com rastreabilidade (`gerarParcelas` já existe e está coberto por testes).
2. **FIN-1:** vincular movimentação bancária existente ou criar e conciliar uma nova.
3. **FIN-1:** cadastro rápido de entidade nos consumidores financeiros; filtros de conta bancária e usuário; upload de documentos aguardando a mutation; operações em lote.
4. **FIN-1:** testes E2E do ciclo completo — criar, editar, liquidar, cancelar, estornar, conciliar.
5. Em paralelo, sem bloqueio: Fase 7 da Auditoria de agosto (manutenção transversal acima).
6. Retomar a próxima frente conforme dependências, mantendo FIN-2+ como metas obrigatórias.

## Riscos ativos

| Risco | Nível | Mitigação obrigatória |
|---|---:|---|
| Operações financeiras compostas no cliente | crítico | RPC transacional + rollback + teste de concorrência |
| Status UI/DB divergentes | crítico | vocabulário canônico central + regressão |
| Permissões financeiras decorativas | crítico | autorização no banco; UI apenas reflete capacidade |
| Schema real divergir das migrations | alto | consultar banco real antes de qualquer DDL |
| Listas/relatórios client-side | alto | paginação e agregação server-side (Relatórios financeiro/vendas ainda pendentes, ver Parte 4) |
| Modelo plano de empresas | alto | grupo/empresa/estabelecimento antes de consolidação |
| Vendor lock-in Supabase | médio | manter domínio atrás de `src/services/**`; abstrair só com alternativa real |
| Complexidade exposta ao pequeno negócio | médio | progressive disclosure e defaults, não outro produto |

## Decisões que só serão abertas quando a fase exigir

1. Provedor inicial de Pix/boleto/Open Finance.
2. Matriz de alçadas e segregação por perfil de cliente.
3. Profundidade fiscal/contábil entregue internamente versus parceiros.
4. País/moeda inicial após BRL para validar FIN-6.
5. Estratégia de custom fields após primeiro caso concreto.

---

# Parte 4 — Pendências abertas agora (pós Auditoria de agosto/2026)

Estado em 2026-08-19, depois de fechar as Fases 1 a 6.5 (Parte 2):

1. **Motor de cálculo de Folha interno** — decisão de produto tomada na Fase 6.5
   (2026-08-19): será motor interno, não parceiro homologado. Ainda não
   implementado — é iniciativa grande e juridicamente sensível (tabelas de
   INSS/IRRF/FGTS mudam por ano, regras de rescisão), precisa de sessão própria de
   escopo antes de virar tarefa. Enquanto isso, `rh/folha/folha-pagamento` mostra
   card de alerta (padrão SPED) e continua aceitando entrada manual.
2. **Fonte de dados de Registros de Ponto** — decisão de produto ainda em aberto
   (import CSV? relógio de ponto? API de terceiro?). `rh/registros-ponto` é
   estrutural, sempre vazia até essa decisão.
3. **Integração de Ponto** — decisão tomada: vai virar execução real (job de
   sincronização), mas só depois do item 2 acima ser decidido (a integração
   sincronizaria esse dado). Config CRUD já é real; falta a execução.
4. **Relatórios Financeiro e Vendas** — únicas duas telas que ficaram de fora da
   paginação/agregação Postgres da Fase 5 (item FIN-2 acima), por decisão explícita
   do usuário: baixo risco/esforço frente à urgência real (base de produção ainda
   pequena). Retomar quando o volume de dados justificar.
5. **Fase 7 (higiene contínua, Parte 3 "Manutenção transversal")** — 16 arquivos
   com acesso direto ao Supabase fora de `services/`, 682 `console.*`/48 `: any` a
   podar, 69 de 78 services de dinheiro sem teste. Pode rodar em paralelo, sem
   bloqueio.
6. **`supabase db advisors --type performance`** — delta final da Auditoria de
   agosto inteira (pedido pela "Verificação global" do plano original) ainda não
   rerodado desde o fechamento da Fase 5 (2026-08-17). Não urgente, mas pendente.

Nenhuma dessas pendências bloqueia as outras — podem ser atacadas em qualquer
ordem conforme prioridade do usuário.
