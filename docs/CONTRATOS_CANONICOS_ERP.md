# Contratos Canônicos do NOVUS ERP — a "língua universal" do hub

**Data:** 2026-07-24
**Status:** Fase 1 (contratos formalizados e aplicados no `data-validator`) concluída. Fases 1b/2/3 abaixo são roadmap.

## 1. Visão

O NOVUS ERP funciona como um **hub SaaS único**: o núcleo profissional que centraliza Vendas, Financeiro, Estoque, RH, Fiscal etc. de cada empresa representada. A visão de produto é conectar **módulos satélite** futuros — um PDV, um sistema de gestão escolar, e outros — que capturam dados na linguagem específica do seu domínio (ex.: PDV fala de "cupom" e "caixa"; um sistema escolar fala de "matrícula" e "mensalidade") e os envia para o NOVUS, onde são **traduzidos e padronizados** para a linguagem universal de um ERP profissional.

Este documento formaliza essa linguagem universal: os **contratos canônicos** de cada entidade core, o **envelope de rastreabilidade** que identifica a origem de cada registro, e como um sistema satélite deve mapear seus próprios dados para este formato.

## 2. O que já existia (achado na auditoria, não construído do zero)

Antes deste documento, o projeto já tinha peças reais desta arquitetura, construídas de forma pontual:

- **`sync-webhook`** (edge function): receptor de dados de sistemas externos, com assinatura HMAC versionada (v1/v2, dual-signing), cabeçalho `x-source-system` (identifica a origem), `x-empresa-id` (tenant), proteção contra replay e reprocessamento por tentativa.
- **`Webhooks.tsx`** + `WebhookConfigModal`: configuração de integrações **de saída** (NOVUS → sistema externo) por empresa.
- **FIN-E5** (migração `20260711120808_...sql`): rastreabilidade e idempotência no fluxo Venda → Conta a Receber. É aqui que nasceram os campos `origem_canal`, `origem_sistema`, `externo_id`, `idempotency_key`, `hash_payload` — hoje persistidos em `contas_receber` (completo), `vendas` (`hash_payload`), `venda_pagamento` (`origem_canal`, `origem_sistema`) e `venda_pagamento_parcelas` (`externo_id`). A função `gerar_contas_receber_da_venda` já implementa idempotência real via hash SHA-256 do payload.
- **`data-validator`** (edge function): validação de payloads de entrada — mas até 2026-07-24 cobria só 4 tabelas com regras hardcoded, sem usar o envelope de origem.

Este documento formaliza esse padrão existente como **o** contrato oficial, em vez de deixá-lo implícito e parcial.

## 3. O envelope de rastreabilidade

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
| `clientes`, `produtos`, `contratos` | ❌ nenhum — contrato validado na Fase 1 é o **alvo**, extensão do schema do banco é Fase 1b (ver §6) |

## 4. Contratos por entidade

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

### ContaReceber
`empresa_representada_id`, `descricao`, `valor_original` (> 0), `data_vencimento` (obrigatórios) · `numero_documento`, `cliente_id`, `data_emissao`, `venda_id`, `venda_pagamento_id`, `venda_pagamento_parcela_id` (opcionais) · `status` (enum, default `PENDENTE`) · regra cruzada: `data_vencimento` não pode ser anterior a `data_emissao` · + envelope de origem (único que já persiste tudo hoje).

## 5. Exemplo — mapeando um PDV para o contrato canônico de Venda

Um PDV fala sua própria língua. Exemplo de payload que ele poderia enviar (formato hipotético, ilustrativo):

```json
{
  "cupom_numero": "CF-000482",
  "data_hora": "2026-07-24T14:32:00-03:00",
  "operador_caixa": "caixa-02",
  "total_liquido": 87.50,
  "linhas": [
    { "sku": "REF-001", "qtd": 2, "valor_unit": 35.00 },
    { "sku": "REF-002", "qtd": 1, "valor_unit": 17.50 }
  ]
}
```

O adaptador do PDV (Fase 2, ainda não implementado) traduziria isso para o contrato canônico de Venda:

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

Só depois desse mapeamento o payload passa pela validação (`data-validator` / `vendaCanonicalSchema`) e segue para `sync-webhook`.

## 6. Roadmap

1. **Fase 1 (concluída 2026-07-24):** contratos canônicos formalizados como schemas Zod (`_shared/canonical/`), `data-validator` reescrito para validar contra eles (substituindo regras hardcoded), cobertura estendida de 4 para 5 tabelas (+ `produtos`), testes Deno adicionados.
2. **Fase 1b:** migração estendendo o envelope de rastreabilidade (`origem_sistema`, `origem_canal`, `externo_id`, `idempotency_key`, `hash_payload`) para `clientes`, `produtos` e `contratos`, hoje sem essas colunas — para paridade com `contas_receber`.
3. **Fase 2:** camada de adaptadores por `source_system` — configurável (reaproveitando o padrão de "Regras de Classificação de Receita" já existente no app: regras de mapeamento configuráveis, não código novo por integração), traduzindo o formato de cada satélite para o contrato canônico antes da validação.
4. **Fase 3:** estender `data-validator`/contratos canônicos para as tabelas restantes (Estoque/movimentações, ContasPagar, RH) conforme os satélites forem sendo conectados.
5. **Fase 4:** observabilidade multi-origem no `SyncDashboard` — saúde e volume por `source_system`, não só por webhook.
