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

**Pivô de estratégia decidido em 2026-08-30**, motivado pelo diagnóstico competitivo em
[`COMPARATIVO_ERP_TOTVS.md`](./COMPARATIVO_ERP_TOTVS.md): o NOVUS estava em
aproximadamente nível 2 de 5 de maturidade de ERP horizontal frente a
TOTVS/Protheus/Sankhya/SAP Business One, com lacunas críticas em contabilidade, compras,
estrutura organizacional, fiscal completo, RH/folha e ativo fixo — nenhuma resolvível por
analogia técnica, todas exigindo construção real (ver Mapa Mestre de Capacidades, Parte 3).

**Nova ambição:** um único núcleo NOVUS contém tudo que uma operação de padrão enterprise
precisa para se gerir — cadastros, estrutura organizacional, contabilidade, fiscal,
compras/suprimentos, estoque, vendas, RH/folha, ativo fixo, orçamento/alçadas, produção
leve, logística leve, varejo/PDV, CRM básico, comunicação transacional e workflow — sem
edições diferentes do produto e sem expor toda a complexidade para quem não precisa dela
(ativação progressiva: uma empresa simples vê poucas telas; uma indústria habilita muito
mais, mas é o mesmo produto).

Isso reverte a posição anterior deste documento, que excluía negócios com
produção/transformação de insumo em produto acabado. **Produção leve (BOM simples, ordem
de fabricação, MRP básico) passa a ser núcleo**, não mais um domínio à parte.

**Verticais especializados continuam satélites**, nunca componentes construídos dentro do
núcleo — plugam pelo mesmo modelo de portas desta Parte 1 (§1.2). Educacional já é o caso
real; saúde, construção, agro, jurídico, hotelaria e indústria pesada com APS/MES entram
do mesmo jeito quando fizer sentido de negócio, com equipe de domínio e homologação
próprias (Parte 3, Onda 4) — nunca por analogia técnica dentro do núcleo.

| Segmento | Como se encaixa |
|---|---|
| Varejo (loja de roupas, mercado) | Venda pontual + Estoque fungível (Porta 3 checa saldo) + PDV/balcão (Programa Varejo e PDV, Parte 3) |
| Escola | Contrato recorrente (mensalidade) + Venda pontual (uniforme, material) — satélite Educacional |
| Indústria leve / transformação simples | Produção leve (Programa Produção Leve, Parte 3) — BOM, ordem de fabricação, consumo e custo |
| Locadora de equipamentos | Contrato recorrente — mas falta rastrear **qual bem específico** está locado (gap abaixo, sem mudança) |
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

# Parte 3 — Mapa Mestre de Capacidades do ERP (backlog priorizado)

*(ex-`ROADMAP_2026.md`, reestruturado em 2026-08-30 seguindo a recomendação final de
[`COMPARATIVO_ERP_TOTVS.md`](./COMPARATIVO_ERP_TOTVS.md): substituir o backlog então
predominantemente financeiro por um mapa organizado pelos ciclos completos de negócio —
compras, contabilidade, fiscal, RH, produção, logística, varejo, CRM e comunicação, além
do financeiro que já existia. Fonte de verdade do que falta no ERP. Uma fase só avança
quando seus critérios de saída estão comprovados.)*

## Regras de execução e continuidade

- Cada entrega deve caber em um checkpoint verificável e deixar o sistema executável.
- Nenhuma operação financeira composta pode depender de compensação manual entre chamadas.
- Alterações de schema/RLS/constraints exigem validação contra o banco real antes da migration.
- Ao pausar, atualizar o topo de `STATUS.md` com: concluído, pendente, arquivos, validações, riscos e **próxima ação única**.
- Documentação e checkpoints são agnósticos de ferramenta: não citar fornecedor, marca, assistente ou ambiente pessoal; registrar apenas evidência técnica reproduzível no repositório.
- Marcação: `[ ]` pendente, `[~]` em execução, `[x]` concluído, `[!]` bloqueado, `🎯` mecânica interna pronta (mock/sandbox quando aplicável) — só falta credencial ou contrato pago externo para ativar. **`🎯` não conta como pendência do núcleo**; cada um referencia um runbook de ativação dedicado (padrão já provado: [`FISCAL_ATIVACAO_PROVEDOR_REAL.md`](./FISCAL_ATIVACAO_PROVEDOR_REAL.md)). Ao escrever um item que misture mecânica interna + serviço pago, sempre quebrar em dois sub-itens — nunca um item só com comentário lateral.
- Itens deste programa são indispensáveis; podem ser reordenados por dependência, não removidos sem decisão explícita registrada.
- **Incremental por padrão** (decisão do usuário, 2026-08-30): toda entrega deste Mapa Mestre é aditiva/adaptativa sobre o que já existe — estende tabelas e services reais em vez de recriar, preserva `empresa_responsavel`/`empresas_representadas` e qualquer outro modelo já em produção sem mudança de significado. Reescrever algo do zero é **último recurso**, só quando uma demanda de mercado concreta (identificada em `COMPARATIVO_ERP_TOTVS.md` ou pesquisa equivalente futura) exigir de verdade — nunca por preferência de design. `ORG-1` corrigido no mesmo dia é o exemplo: a primeira tentativa (tabelas novas `grupos_economicos`/`estabelecimentos`) foi revertida ainda vazia, sem nenhum consumidor, ao ficar claro que não batia com o modelo real (ver nota em `ORG-1` abaixo) — substituída por uma única coluna nova (`matriz_empresa_representada_id`) sobre a tabela que já existia.

## Programa Financeiro-Contábil (FIN-0 a FIN-8)

Objetivo: servir desde operação simples de caixa até grupo econômico multiempresa/multifilial, sem expor complexidade corporativa para quem não precisa dela.

### FIN-0 — Integridade e segurança transacional
**Estado:** `[x]` concluída em 2026-08-11. RPCs transacionais/idempotentes de liquidar, estornar e cancelar título; baixa parcial real; permissões financeiras aplicadas na UI/serviço/RLS; exclusão física bloqueada; isolamento entre empresas provado.

### FIN-1 — Completar fluxos atualmente parciais ou apenas visuais
**Prioridade atual.**
- [~] Submodal de cancelamento (implementado; validação visual local pendente — bug da ferramenta de screenshot na sessão de 2026-09-07 impediu concluir, código já revisado e íntegro).
- [x] Submodal de estorno — data contábil manual (2026-09-07): campo novo no diálogo, RPC `financeiro_estornar_liquidacao` ganhou `p_data_contabil` (valida não-futuro e não-anterior à liquidação), trigger `lancar_estorno_liquidacao` usa a data escolhida em vez de `CURRENT_DATE` fixo. Provado via SQL com RPCs reais (`supabase/sql/fin1_estorno_data_contabil_prova.sql`), zero resíduo.
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
- (Abertura/fechamento de caixa e sangria/suprimento — relocado para `VAR-1`, Programa Varejo e PDV.)
- [ ] Visão diária: entradas, saídas, saldo, vencimentos e atrasos.
- [ ] Recorrências monitoradas, com falhas e próxima geração visíveis.
- [ ] Lembretes de cobrança e comprovantes pelo celular.
- [ ] Mecânica interna de cobrança Pix/boleto/link (geração de payload/linha digitável/QR).
- [ ] 🎯 Contrato com adaptador de PSP autorizado para efetivar a cobrança (runbook: `docs/PAGAMENTOS_ATIVACAO_PROVEDOR_REAL.md`, a criar quando o provedor for escolhido).
- [ ] Importação OFX/CSV com mapeamento assistido e prevenção de duplicidade.

**Critério de saída:** uma empresa de caixa único consegue operar sem configurar contabilidade, filiais ou workflow corporativo manualmente.

### FIN-4 — Subledger e contabilidade por partidas dobradas (fundação do núcleo)

Fundação do núcleo, prioridade máxima junto de `ORG-` — todo evento dos demais programas
(Compras, Ativo Fixo, RH, Produção) deve gerar lançamento aqui, nunca um razão paralelo
por módulo. Também é o que desbloqueia o SPED, hoje fachada declarada no próprio código
(`src/pages/fiscal/SPED.tsx:31`, geração desabilitada por não existir livro contábil real
por trás).

- [x] Livro imutável de lançamentos e linhas débito/crédito balanceadas — `lancamentos_contabeis`/`lancamentos_contabeis_itens`, sem policy de UPDATE/DELETE, trigger deferred garantindo débito=crédito em cada lançamento. Migration `20260830160000`, testado ao vivo (não só prova sintética).
- [~] Regras de contabilização — título criado (`CONTAS_RECEBER`/`CONTAS_PAGAR`, com suporte a rateio) e liquidação (valor efetivo = principal+juros+multa-desconto) geram lançamento automático, testado ao vivo pelo fluxo real (`financeiro_salvar_titulo`→trigger, `financeiro_liquidar_titulo`→trigger). Estorno de liquidação gera reversão automática — validado só em prova sintética (`BEGIN...ROLLBACK`), não ao vivo, porque o próprio estorno exige segunda senha (gate de segurança pré-existente do FIN-0) que não devo preencher por conta do usuário. Pendente: tarifas bancárias avulsas, transferências entre contas, cancelamento de título (o próprio submodal de cancelamento no FIN-1 ainda não está estável), recebimento de compra/folha/depreciação (esperam `COMP-`/`RH-`/`ATV-` existirem).
- [~] Períodos contábeis — `periodos_contabeis` com resolução automática por competência (`resolver_periodo_contabil`, cria o período ABERTO na hora se não existir). Fechamento/reabertura formal (UI, trava de lançamento em período FECHADO) ainda não construído.
- [ ] Plano de contas versionado e mapeamento referencial — plano mínimo semeado (5 contas ATIVO/PASSIVO/PATRIMONIO + as RECEITA/DESPESA que já existiam), mas sem versionamento por vigência ainda.
- [ ] Livro diário, razão e balancete derivados do mesmo livro.
- **Relatórios contábeis essenciais, gerados diretamente do razão (nunca digitados ou calculados à parte):**
  - [x] **Balanço Patrimonial** (ativo/passivo/patrimônio líquido). `/financeiro/balanco`, modos Sintético/Analítico, RPC `relatorio_balanco_patrimonial`. Fechado 2026-09-07 (FIN-4 parte 2, fatia 1).
  - [x] **DRE** (Demonstração do Resultado do Exercício). `/financeiro/dre`, modos Sintético/Analítico, RPC `relatorio_dre`. Fechado 2026-09-07 (fatia 1).
  - [x] **EBITDA** — derivado da DRE + do Programa Ativo Fixo (`ATV-`) para a parcela de depreciação/amortização (conta `plano_conta_despesa_depreciacao_default_id`, nunca por nome/código). Fechado 2026-09-07 (fatia 1).
  - [x] **DMPL** (Demonstração das Mutações do Patrimônio Líquido). `/financeiro/dmpl`, RPC `relatorio_dmpl`, reconcilia com o Balanço nos dois extremos do período. Fechado 2026-09-07 (fatia 2).
  - [x] **DFC** (Demonstração do Fluxo de Caixa, método indireto) — reconciliada com o Fluxo de Caixa operacional já existente (`fluxoCaixaService.ts`, que continua sendo a projeção por vencimento, não substituída) via a identidade contábil FCO+FCI+FCF = variação real do Caixa e Bancos. `/financeiro/dfc`, RPC `relatorio_dfc_indireto`. Fechado 2026-09-07 (fatia 3).
- [ ] Trilhas para ECD/ECF/SPED sem misturar regra fiscal ao núcleo financeiro.
- [ ] Reconciliação entre subledgers de pagar/receber/bancos e razão geral.

**Critério de saída:** todo evento financeiro contabilizado produz débito = crédito, só pode ser corrigido por lançamento reverso auditável, **e os relatórios essenciais (Balanço, DRE, EBITDA, DMPL, DFC) são gerados diretamente do razão**, nunca digitados ou calculados à parte. **Atingido em código** (2026-09-07) — falta só o checkpoint humano (contador validando plano de contas/relatórios).

### FIN-5 — Grupo econômico, multiempresa e multifilial
- (Matriz/filial e dimensões — relocado para `ORG-1`/`ORG-2`, Programa Estrutura Organizacional.)
- [ ] Tesouraria e contas a pagar centralizadas com operação local controlada.
- (Workflow de aprovação e segregação solicitante × aprovador × pagador — relocado para `ORC-1`, Programa Orçamento e Alçadas.)
- [ ] Orçamento, realizado e compromissado por dimensão (execução via `ORC-2`).
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

## Programa Estrutura Organizacional

**Nota de correção (2026-08-30, mesma sessão que abriu este programa):** a primeira versão
de `ORG-1` modelava grupo econômico e estabelecimento como **tabelas novas**
(`grupos_economicos`, `estabelecimentos`) por cima/dentro de `empresas_representadas`.
Revertida ainda no mesmo dia, antes de qualquer UI ou dado real depender dela — não batia
com o modelo de negócio real: **`empresa_responsavel` já é o grupo econômico** de uma
instalação NOVUS (todas as `empresas_representadas` de um tenant já pertencem a ele por
definição), e **matriz/filial são outras linhas de `empresas_representadas`**, nunca um
sub-registro dentro de uma só — cada filial tem CNPJ e Inscrição Estadual próprios e
precisa emitir nota fiscal com identidade própria (realidade fiscal brasileira), o que o
módulo Fiscal já pressupõe (`empresa_representada_id` como unidade emissora). Consolidar
negócios de ramos totalmente diferentes sob um mesmo grupo (ex.: autopeças + restaurante do
mesmo dono) foi explicitamente descartado do escopo do NOVUS core — cada ramo/mecânica
distinta merece sua própria instalação; um produto separado de consolidação gerencial
multi-negócio ("ERP Enterprise") ficou registrado como ideia futura, não iniciado.

### ORG-1 — Matriz e filial (FK real entre empresas_representadas)
- [x] Coluna `matriz_empresa_representada_id` (auto-referenciada, nullable, com CHECK
  contra auto-referência) substituindo o campo solto que já existia
  (`configuracoes->>'cnpj_matriz'`, texto livre sem FK, dentro de `EmpresasRepresentadasList.tsx`)
  — migration `20260830150000_org1_correcao_matriz_filial_fk.sql`. UI atualizada: o campo
  "Filial" agora seleciona a matriz de uma lista real de empresas, não digita CNPJ solto.
  Nenhuma migração de dado necessária (base de produção não tinha nenhuma filial cadastrada
  ainda). RLS não mudou — a policy de UPDATE já existente em `empresas_representadas`
  (admin da própria empresa) cobre a nova coluna.
- [ ] Dimensões configuráveis adicionais (unidade de negócio, projeto, canal — centro de
  custo já existe) — item independente de matriz/filial, sem demanda concreta registrada
  ainda; não iniciar especulativamente (mesmo princípio já usado para custom fields, §1.10).

### ORG-2 — Escopo de usuário por filial
- [x] **Já resolvido pelo modelo existente, não precisa de trabalho novo**: como cada
  filial é sua própria `empresa_representada`, dar acesso de um usuário a uma filial
  específica já é só uma linha em `user_roles` com aquele `empresa_representada_id` —
  o mecanismo de escopo (`has_role_for_empresa`/`user_has_access_to_empresa`) já existe e
  já é usado para isso. **Migração de `estabelecimento_id` (do desenho anterior) não se
  aplica mais** — não existe mais essa coluna, e as referências a ela em `COMP-1`/`ATV-1`
  abaixo devem ser lidas como "qual `empresa_representada` (matriz ou filial)", já coberto
  pelas FKs que essas tabelas já vão ter.

**Critério de saída:** uma filial é uma empresa representada de verdade, resolvível pela
matriz via FK, com fiscal/RH/compras funcionando nela como em qualquer outra empresa — sem
usar centro de custo como filial (risco já registrado abaixo, "Modelo plano de empresas").

## Programa Compras e Suprimentos

Ciclo procure-to-pay completo, hoje 100% ausente — nem tabela, nem service, nem rota —
apesar de já existir a permissão `compras.create/read/update/delete/aprovacao` cadastrada
em `PermissionsSelector.tsx:45-49` sem nenhum módulo por trás.

### COMP-1 — Ciclo completo
- [x] Requisição de compra interna (COMP-1a, fechado 2026-09-07) — tela
  `/compras/requisicoes`, ações de documento (Visualizar/Imprimir/PDF/E-mail/
  WhatsApp) no mesmo padrão de Orçamentos/Vendas.
- [x] Cotação/mapa comparativo entre fornecedores (COMP-1b, fechado 2026-09-07)
  — tela `/compras/cotacoes`, vencedor por item, **link público sem login**
  (`/cotar/:id`) pro fornecedor preencher o próprio preço direto, com portão
  de confirmação por CNPJ/CPF e cabeçalho com logo da empresa (pedido
  explícito do usuário, camada extra contra link endereçado errado).
- [x] Pedido de compra formal, vinculado a Produto (Estoque) — já escopado por `empresa_representada_id` (matriz ou filial, `ORG-1`), sem coluna nova necessária. (COMP-1c, fechado 2026-09-07)
- [x] Aprovação por alçada antes de emitir ao fornecedor (`ORC-1`) — primeiro consumidor real do motor, valor calculado no servidor (nunca confia no cliente).
- [x] Recebimento físico — reaproveita `estoque_movimentacoes` tipo ENTRADA (motor já maduro), com conferência quantidade contra o pedido (parcial permitido, nunca excede). (COMP-1d, fechado 2026-09-07)
- [x] Match de 3 vias (pedido × recebimento × título) gerando `contas_pagar` automaticamente + lançamento em `FIN-4` (motor já existente, disparado sozinho ao inserir o título). (COMP-1d, fechado 2026-09-07)
- [ ] Devolução a fornecedor.
- [ ] Ativar de fato as permissões `compras.*` já cadastradas.

**Critério de saída:** uma compra nasce como requisição e termina em título a pagar + lançamento contábil, sem digitação solta em nenhuma etapa. **Atingido** para o caminho feliz (COMP-1a→1d); faltam só devolução e o gate de permissões granulares.

## Programa Ativo Fixo

### ATV-1 — fechado 2026-08-30
- [x] Cadastro de bem (aquisição, vida útil, taxa, empresa/filial via `empresa_representada_id`) — tabela `ativos_fixos` + tela `/financeiro/ativos-fixos`. Ao salvar, gera lançamento de aquisição automático (Débito Imobilizado / Crédito Caixa e Bancos — compra à vista, ver nota `COMP-` abaixo).
- [x] Motor de depreciação → lançamento automático em `FIN-4` (alimenta também o EBITDA) — RPC `processar_depreciacao_mensal`, sob demanda (botão "Processar Depreciação do Mês"), idempotente por competência (não duplica se rodado 2x no mesmo mês). Linear simples; métodos acelerados não implementados.
- [x] Baixa/alienação com ganho/perda — RPC `baixar_ativo_fixo`, testado ao vivo com ganho e com perda, lançamento sempre balanceado. Simplificação deliberada: uma única conta "Resultado na Baixa de Imobilizado" recebe débito (perda) ou crédito (ganho), em vez de contas de Receita/Despesa separadas.
- [ ] Vínculo automático com `COMP-` (compra de imobilizado gera o ativo) — segue pendente, só faz sentido quando `COMP-1` existir; por ora toda aquisição é tratada como compra à vista.

**Critério de saída:** todo bem depreciável gera lançamento mensal automático no razão, sem planilha de depreciação paralela. **Atingido** para o ciclo aquisição→depreciação→baixa; agendamento automático mensal (pg_cron) e o vínculo com `COMP-` ficam para quando fizer sentido (mudança de configuração persistente e dependência de programa ainda não construído, respectivamente).

## Programa Orçamento e Alçadas

Hoje só existem 2 soluções pontuais isoladas (`autorizacaoFinanceiraService.ts`:
reautenticação de senha para 3 ações financeiras específicas; `porta3Service.ts`:
autorização de exceção de crédito em vendas a prazo) — sem motor genérico reutilizável.

### ORC-1 — Motor de alçadas — fechado 2026-09-07 (sem consumidor real ainda)
- [x] Motor de alçada mínimo (valor × categoria × empresa/filial × perfil) — tabela `alcadas_aprovacao` (faixa por `valor_minimo`, mais específica vence) + RPC `resolver_alcada`. **Não consumido ainda**: `COMP-1` não existe, e a reautenticação pontual do Financeiro (`autorizacaoFinanceiraService.ts`) não foi tocada — decisão deliberada, ver `docs/STATUS.md`.
- [x] Segregação solicitante × aprovador × pagador e substituição temporária auditada — `decidir_solicitacao` bloqueia incondicionalmente (mesmo admin) quem abriu a solicitação de decidi-la; `alcadas_substitutos` permite um substituto aprovar em nome de um titular, só enquanto o titular também detiver a permissão exigida (não é promoção).
- [x] Trilha de auditoria unificada — `solicitacoes_aprovacao` é a própria trilha (mesmo padrão `porta3_autorizacoes_excecao`: leitura ampla, escrita só via RPC `SECURITY DEFINER`).

**Critério de saída do ORC-1 isolado**: motor genérico correto e provado (16 asserções em `BEGIN...ROLLBACK`, ver STATUS). O critério de saída do *programa* ("nenhuma compra ou pagamento acima da alçada sai sem aprovação") só fecha quando `COMP-1` (ou a migração do Financeiro) existir e consumir o motor — mesmo padrão do ATV-1 (vínculo com `COMP-` pendente).

### ORC-2 — Orçamento empresarial
- [ ] Orçado × realizado × comprometido por dimensão (depende de `ORG-`/`FIN-4` para "realizado" real).

**Critério de saída:** nenhuma compra ou pagamento acima da alçada configurada sai sem aprovação registrada e auditável. Generalizar para um motor de workflow/BPM (`DOC-1`) só quando houver ≥2 consumidores reais provados.

## Programa RH e Departamento Pessoal

O cadastro (Colaboradores/Cargos/Departamentos) já é Real e não muda. Este programa cobre
só o gap: folha manual, ponto sem fonte, eSocial inexistente.

### RH-1 — Motor de folha
- [ ] Motor de cálculo interno INSS/IRRF/FGTS por competência (decisão de produto já tomada na Fase 6.5, Parte 4).
- [ ] Férias/13º/rescisão a partir de Colaboradores/Cargos já existentes.
- [ ] Vencimentos/Descontos/Benefícios (hoje só cadastro) passam a alimentar a folha automaticamente.
- [ ] Lançamento automático da folha em `FIN-4` (débito despesa de pessoal, crédito obrigações/salários a pagar).

### RH-2 — Ponto e eSocial
- [ ] Fonte real de Registros de Ponto (decisão de produto ainda em aberto — Parte 4).
- [ ] 🎯 Transmissão eSocial — geração de evento é núcleo; envio ao ambiente do governo depende de certificado digital, mesma família de exigência do Fiscal (runbook futuro: `docs/RH_ATIVACAO_ESOCIAL.md`).

**Critério de saída:** folha de um colaborador é calculada, não digitada, e gera lançamento contábil correto sem intervenção manual.

## Programa Produção Leve

Núcleo por decisão do usuário (2026-08-30) — reverte a exclusão anterior de
produção/manufatura (§1.8).

### PROD-1 — Básico
- [ ] Ficha técnica/BOM simples.
- [ ] Ordem de fabricação simples (consome Estoque, gera produto acabado).
- [ ] Apontamento de consumo × planejado, custo médio de produção.

### PROD-2 — Onda 3, mais profundo
- [ ] MRP com explosão e múltiplos níveis de BOM.

**Critério de saída:** uma ordem de fabricação simples baixa insumo, gera produto acabado com custo real e lançamento contábil, sem planilha paralela de produção.

## Programa Logística Leve

Estende o Estoque já maduro (Kardex, movimentações, inventário).

### LOG-1
- [ ] Lote/série/validade (Kardex hoje só rastreia quantidade).
- [ ] Picking/packing/romaneio simples.
- [ ] Inventário rotativo (cíclico, além do inventário geral já existente).

## Programa Varejo e PDV

### VAR-1 — Caixa e balcão
- [ ] Abertura e fechamento de caixa por operador/turno. *(relocado de FIN-3)*
- [ ] Sangria, suprimento, conferência e diferença esperado × contado. *(relocado de FIN-3)*
- [ ] Fluxo de venda balcão dentro de Vendas, reutilizando venda/pagamento/estoque existentes.
- [ ] 🎯 TEF/adquirente de cartão — interface é núcleo, contrato com adquirente é ativação externa.

## Programa CRM

### CRM-1 — Básico
- [ ] Histórico de compras/ticket médio na tela de Venda (gap já registrado em §1.10).
- [ ] Pipeline simples de oportunidade (distinto do CRM de leads educacionais do satélite Educacional — domínios diferentes, não compartilhar tabela).

## Programa Comunicação Transacional

`DeliveryProvider`/`EmailProvider` hoje são um stub deliberadamente dormente (nunca chama
nenhum serviço real, nem Resend nem outro).

### COM-1
- [ ] Ativar `EmailProvider` com um provedor real por trás da interface já existente.
- [ ] Fila/log com reprocessamento (padrão outbox de Webhooks já existente).
- [ ] 🎯 WhatsApp/SMS: fila/template é núcleo; envio real depende de contrato com provedor (runbook futuro: `docs/COMUNICACAO_ATIVACAO_PROVEDOR_REAL.md`).

## Programa Workflow e Documentos (adiado)

`DOC-1` — motor de BPM/workflow genérico. Deliberadamente adiado: mesmo princípio já usado
no projeto para custom fields — não generalizar sem ≥2 consumidores reais provados
(candidatos: `ORC-1` e Compras). Revisitar na Onda 2.

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
- (Folha real — agora tracked formalmente em `RH-1`, Programa RH e Departamento Pessoal.)
- [ ] Bem locável/serializado separado do estoque fungível antes do satélite de locação (Parte 1, §1.8).
- [ ] Custom fields somente após caso real; preferir `metadata jsonb` antes de EAV, salvo prova contrária.

### Manutenção transversal (= Fase 7 da Auditoria de agosto, Parte 4)
- [ ] Remover chamadas Supabase de componentes/hooks e respeitar `src/services/**` — **16 arquivos** identificados na Auditoria de agosto ainda pendentes.
- [ ] Eliminar logs de debug e `any` por área, mantendo gates verdes — **682 `console.*`/48 `: any`** no snapshot da auditoria, ainda não podados.
- [x] Manter rotas canônicas, estados vazios úteis e seletores escaláveis — **fechado pelas Fases 2-5** da Auditoria de agosto (Parte 2).
- [x] Revisar RLS, UNIQUE/onConflict, CHECKs e FKs no banco real em cada frente — **fechado pelas Fases 1/1.5/6** da Auditoria de agosto (Parte 2).

## Ondas de execução (substitui a sequência anterior, 2026-08-30)

FIN-0 concluída em 2026-08-11. Auditoria de agosto/2026 (Fases 1-6.5) concluída em
2026-08-19 (Parte 2). O pivô de estratégia (§1.8) reorganiza o que falta em Ondas —
cada uma só avança quando a anterior fecha seu critério de saída, mas **`FIN-1` não é
interrompida**: continua em paralelo até fechar, junto do início da Onda 1.

**Onda 0 — esta entrega (2026-08-30).** Só documento: §1.8 e esta Parte 3 reescritas.
Nenhuma frente de código nova começa antes disso fechar.

**Onda 1 — direito de ser chamado ERP completo:**
- `ORG-1`, `ORG-2` — fundação organizacional.
- `FIN-4` — contabilidade por partidas dobradas, junto de `ORG-`.
- `COMP-1` — compras e suprimentos completos.
- `ATV-1` — ativo fixo.
- `ORC-1` — motor de alçadas mínimo.
- `PROD-1` — produção leve básica.
- Fiscal: destravar SPED (`src/pages/fiscal/SPED.tsx:31`) agora que `FIN-4` existe para alimentá-lo; completar NFC-e/CCe/contingência.
- `FIN-1` (em andamento) até fechar; `FIN-8` baseline de segurança.

Critério de saída: uma empresa comercial ou de transformação leve compra, recebe, produz
(quando aplicável), vende, fatura, paga, recebe, contabiliza, fecha e cumpre obrigações
fiscais sem planilha paralela.

**Onda 2 — paridade de mercado médio:** `FIN-5` residual + `FIN-7` (mecânica CNAB/Pix/
boleto/Open Finance, ativação `🎯`), `RH-1`/`RH-2` (motor de folha núcleo, eSocial `🎯`),
`VAR-1` (caixa/PDV núcleo, TEF `🎯`), `CRM-1`, `COM-1` (fila/template núcleo, envio real
`🎯`), `ORC-2`, `DOC-1` só se houver ≥2 consumidores reais provados.

**Onda 3 — cadeia operacional:** `LOG-1` (WMS leve), `PROD-2` (MRP mais robusto),
projetos/timesheet leve, comércio exterior.

**Onda 4 — profundidade vertical (satélites, fora do núcleo):** saúde, construção, agro,
jurídico, hotelaria, indústria pesada com APS/MES — plugam via o modelo de portas da
Parte 1, nunca entram no núcleo.

## Roadmap de execução com agente de IA (2026-08-30)

O `COMPARATIVO_ERP_TOTVS.md` estima "3 a 5 anos com pelo menos quatro squads" ou "mais de
8 anos com uma equipe pequena" — essa referência **não se aplica aqui**. O histórico real
deste projeto mostra velocidade muito diferente trabalhando com agente de IA: as Fases 1,
1.5, 2, 3, 4 e 6 da Auditoria de agosto (6 frentes, cada uma com migration, service, UI e
validação ao vivo) fecharam **todas no mesmo dia** (2026-08-16); a padronização de
relatórios PDF/Excel (8 fases do plano, `preciso-modernizar-a-uix-velvet-cookie.md`) fechou
inteira **na mesma sessão** em que foi aprovada (2026-08-11). A unidade de planejamento
aqui é a **sessão de trabalho com agente**, não sprint/semana de time humano.

**O que não acelera com agente de IA — é o gargalo real, não o código:**
- Validação de plano de contas e dos relatórios contábeis (`FIN-4`) por um contador real.
- Regras de folha/rescisão (`RH-1`) revisadas por quem responde legalmente por isso.
- Contratação de qualquer serviço pago (`🎯`): provedor de PSP (Pix/boleto/cartão),
  WhatsApp Business API, certificado digital para eSocial, homologação de produção do
  Focus NFe além do que já existe. Essas datas dependem do usuário assinar contrato, não
  de sessão de código.

**Onda 1 — sequência de sessões recomendada** (fundação, sem dependência externa paga):

| # | Item | Sessões (estimativa) | Nota |
|---|---|---:|---|
| 1 | `ORG-1` — matriz/filial via FK real | ~~1-2~~ **feito** | Fechado em menos de 1 sessão: 1 coluna nova (`matriz_empresa_representada_id`) + UI, depois de reverter uma primeira tentativa com tabelas novas que não batiam com o modelo real (ver nota em `ORG-1`, acima). |
| 2 | `ORG-2` — escopo de usuário por filial | ~~1-2~~ **não precisa** | Já coberto pelo mecanismo de `user_roles`/`has_role_for_empresa` existente — cada filial é uma `empresa_representada` normal. |
| 3 | `FIN-4` parte 1 — livro, lançamento automático de título/liquidação/estorno, períodos/fechamento | **feito o motor** (~1 sessão) | Testado ao vivo (título+liquidação reais, estorno só em prova sintética). **Checkpoint humano ainda pendente**: plano mínimo semeado é um bootstrap universal, não substitui a validação do contador sobre o plano de contas de referência e as regras de contabilização — não tratar como fechado de vez até isso acontecer. Fechamento formal de período e cobertura de tarifas/transferências ficam pra completar a parte 1. |
| 4 | `ATV-1` — ativo fixo | ~~2-3~~ **feito** (~1 sessão) | Fechado em menos de 1 sessão: cadastro + motor de depreciação (RPC sob demanda) + baixa com ganho/perda, testado ao vivo (criação, depreciação, baixa com perda — R$1.200 aquisição, R$100 depreciado, R$900 na baixa, perda de R$200 balanceada). |
| 5 | `FIN-4` parte 2 — Balanço, DRE, EBITDA, DMPL, DFC | ~~2-3~~ **feita** (~1 sessão, fatiada em 1+2+3) | Todas as 3 fatias fechadas 2026-09-07, testadas ao vivo com dado abundante real. **Checkpoint humano: contador confere os relatórios gerados contra um fechamento real ou simulado.** |
| 6 | `COMP-1` — compras e suprimentos completo | ~~3-5~~ **feito** (~1 sessão, fatiado em COMP-1a/1b/1c/1d) | Ciclo completo Requisição→Cotação→Pedido→Recebimento→título a pagar, fechado 2026-09-07. |
| 7 | `ORC-1` — motor de alçadas mínimo | ~~2-3~~ **feito** (~1 sessão) | Fechado 2026-09-07, primeiro consumidor real é o Pedido de Compra (item 6). |
| 8 | `PROD-1` — produção leve básica | 3-4 | Conceitualmente é "venda que baixa estoque" invertida — consumo em vez de saída por venda. |
| 9 | Fiscal — destravar SPED + NFC-e/CCe/contingência | 2-4 | SPED completo (EFD ICMS/IPI, ECD, ECF) só fecha depois do item 3-5 **e** validação contábil — não é só código. |
| 10 | `FIN-1` (cauda já em andamento) + `FIN-8` baseline | 2-4 | Roda em paralelo, sem bloquear os itens acima. |

**Total Onda 1: ~16-24 sessões de código** (revisado para baixo 2 vezes: `ORG-1`/`ORG-2`
fecharam em menos de 1 sessão combinada — eram `~1-2` cada — e `ATV-1` fechou em ~1 sessão
em vez de `2-3`). Rodando em ritmo de várias sessões por semana (o próprio histórico do
projeto já sustentou isso — nesta mesma data, `ORG-1`, `FIN-4` parte 1 e `ATV-1` fecharam
todos na mesma sessão), isso é da ordem de **semanas de calendário, não meses ou anos** —
desde que os dois checkpoints humanos (itens 3 e 5) não fiquem parados esperando agenda do
contador.

**Marco de saída da Onda 1:** o ERP passa a ser "completo" no sentido do
`COMPARATIVO_ERP_TOTVS.md` — uma empresa comercial ou de transformação leve compra, recebe,
produz, vende, fatura, paga, recebe, contabiliza, fecha e cumpre obrigações fiscais sem
planilha paralela. Isto é o primeiro nível real de "ERP 100% operacional" citado no pedido
do usuário — cobre backoffice completo, ainda sem paridade de mercado médio (Onda 2).

**Onda 2 — estimativa mais grossa** (menos precisa: depende de decisões ainda em aberto —
provedor de PSP, uso ou não de WhatsApp Business API, escopo do eSocial, Parte 4 item 7):

| Item | Sessões (mecânica interna) | 🎯 fora do controle do agente |
|---|---:|---|
| `RH-1` motor de folha | 4-6 | — (é interno, juridicamente sensível, não paga) |
| `RH-2` ponto + eSocial | 2-3 | Certificado digital + decisão de escopo (Parte 4 item 7) |
| `VAR-1` caixa/PDV | 2-3 | Contrato de TEF com adquirente |
| `FIN-5` residual + `FIN-7` mecânica de pagamentos | 3-5 | Escolha e contrato do PSP (Pix/boleto/cartão) |
| `CRM-1` | 1-2 | — |
| `COM-1` comunicação | 1-2 | Contrato de e-mail/WhatsApp real |
| `ORC-2` orçamento empresarial | 1-2 | — |

**Total Onda 2: ~15-25 sessões de código**, mais o tempo — fora do controle de sessão —
que o usuário levar para fechar os contratos pagos marcados `🎯`. A mecânica interna de
cada um fica pronta independente disso (mesmo padrão já provado no Fiscal).

**Marco de saída da Onda 2:** paridade forte de mercado médio — compete de verdade com
Sankhya, SAP Business One e o núcleo do Protheus, segundo o próprio critério do
`COMPARATIVO_ERP_TOTVS.md`. Este é o segundo nível de "100% operacional", mais completo
que o marco da Onda 1.

**Onda 3 — estimativa preliminar, revisar quando a Onda 2 fechar:** `LOG-1` (2-3 sessões),
`PROD-2` (2-3 sessões), projetos/timesheet leve e comércio exterior (baixa prioridade, sem
estimativa firme ainda — só entram quando a Onda 2 estiver perto do fim).

**Onda 4 — não estimável agora de propósito:** cada vertical (saúde, construção, agro,
jurídico, hotelaria, indústria pesada) é seu próprio programa multi-sessão, disparado só
quando houver demanda real de negócio para aquele segmento — estimar sessões antes de saber
qual vertical entra primeiro seria número inventado, não estimativa.

**Total combinado até o "ERP 100% operacional" na acepção mais forte (fim da Onda 2):
~35-55 sessões de código**, calendário estimado em poucos meses se as sessões rodarem em
ritmo semanal e os dois gargalos humanos (contador, contratos `🎯`) não empacarem — não os
"3 a 5 anos com quatro squads" do comparativo, que pressupõe equipe humana tradicional.

## Riscos ativos

| Risco | Nível | Mitigação obrigatória |
|---|---:|---|
| Operações financeiras compostas no cliente | crítico | RPC transacional + rollback + teste de concorrência |
| Status UI/DB divergentes | crítico | vocabulário canônico central + regressão |
| Permissões financeiras decorativas | crítico | autorização no banco; UI apenas reflete capacidade |
| Schema real divergir das migrations | alto | consultar banco real antes de qualquer DDL |
| Listas/relatórios client-side | alto | paginação e agregação server-side (Relatórios financeiro/vendas ainda pendentes, ver Parte 4) |
| Modelo plano de empresas | alto | ~~grupo/empresa/estabelecimento~~ matriz/filial via FK real antes de qualquer relatório consolidado (`ORG-1`, fechado 2026-08-30) |
| Vendor lock-in Supabase | médio | manter domínio atrás de `src/services/**`; abstrair só com alternativa real |
| Complexidade exposta ao pequeno negócio | médio | progressive disclosure e defaults, não outro produto |

## Decisões que só serão abertas quando a fase exigir

1. Provedor inicial de Pix/boleto/Open Finance.
2. Matriz de alçadas e segregação por perfil de cliente.
3. Profundidade fiscal/contábil entregue internamente versus parceiros.
4. País/moeda inicial após BRL para validar FIN-6.
5. Estratégia de custom fields após primeiro caso concreto.
6. Motor de regra fiscal para CBS/IBS pós-transição.
7. Escopo do eSocial — o que o NOVUS emite internamente vs. delega (ver Parte 4).

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
7. **Escopo do eSocial ainda não decidido** — distinto da decisão de folha já tomada
   na Fase 6.5 (item 1 acima); decidir o que o NOVUS emite internamente vs. delega
   antes de iniciar `RH-2` (Onda 2, Parte 3).

Nenhuma dessas pendências bloqueia as outras — podem ser atacadas em qualquer
ordem conforme prioridade do usuário.
