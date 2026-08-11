# Plano — Campos personalizados, extensibilidade e usabilidade de artefatos

## Estado de execução

- **Fase 1 concluída em 2026-08-11** para o cadastro unificado de entidades.
- **Fase 2 concluída em 2026-08-11** na lista de Entidades: colunas fixas e personalizadas configuráveis por usuário, empresa e tela.
- **Fase 3 concluída em 2026-08-11** no primeiro evento `titulo.liquidado`: outbox transacional, HMAC, retry e cron ativos no ERP.
- Migration `20260811210000_campos_personalizados_entidades.sql` aplicada no ERP.
- Administração disponível em `Configurações → Campos personalizados`, restrita a admin.
- `FormEntidade` renderiza as definições ativas, valida obrigatoriedade e persiste os valores em `entidades.campos_extras`.
- Chave técnica e tipo ficam imutáveis após a criação; inativar uma definição oculta o campo sem apagar valores históricos.
- O índice GIN inicialmente proposto não foi criado: ainda não há consulta ou filtro por conteúdo de `campos_extras`; adicionar somente quando a Fase 2 introduzir essa necessidade.

Origem: documento de arquitetura ERP (padrão Java/Spring, dicionário de dados dinâmico
com DDL em background, plugins JAR, mensageria Kafka/RabbitMQ). Este plano extrai só o
que se adapta ao stack real (Vite+React+TS+Supabase, RLS multi-tenant) e descarta o resto
sem debate — decisão já tomada, não repetir análise aqui.

Regra geral de toda fase: `empresa_representada_id` explícito em toda query nova (ver
`CLAUDE.md` — isolamento entre empresas não é opcional), migração sempre aditiva
(`ADD COLUMN IF NOT EXISTS`, nunca `DROP`/`RENAME`), nenhuma edição de arquivo com acento
via PowerShell.

---

## Fase 1 — Campos personalizados (dicionário de dados sem DDL)

Objetivo: usuário/consultor adiciona um campo customizado num cadastro sem o time tocar
código-fonte. Substitui o `ALTER TABLE` em background do documento original por
`jsonb` + tabela de definição — zero downtime, zero lock, RLS já cai de graça porque a
linha continua pertencendo à mesma empresa.

### 1.1 — Migração

Escopo inicial: só `entidades` (é onde cliente/fornecedor já vive, ver
`src/services/entidadeService.ts`).

```sql
-- supabase/migrations/<timestamp>_campos_personalizados.sql

ALTER TABLE entidades ADD COLUMN IF NOT EXISTS campos_extras jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS campos_personalizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES empresas_representadas(id),
  entidade text NOT NULL, -- 'entidades' | futura extensão ('produtos', etc.)
  chave text NOT NULL,    -- nome técnico, ex. 'adicional_cliente'
  rotulo text NOT NULL,   -- label exibido
  tipo text NOT NULL CHECK (tipo IN ('texto','numero','data','booleano','selecao')),
  opcoes jsonb,           -- só quando tipo = 'selecao'
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE campos_personalizados ENABLE ROW LEVEL SECURITY;
-- policy: só linhas da própria empresa (seguir padrão já usado nas outras tabelas do projeto)

-- Índice GIN adiado até existir consulta/filtro por conteúdo de campos_extras.
```

Por que não `ALTER TABLE` de verdade em runtime: em RLS multi-tenant, campo de um
cliente viraria coluna física pra todos os tenants; tipos TS gerados pelo Supabase CLI
quebrariam a cada cadastro; migração deixaria de ser reprodutível/versionada.
`jsonb` resolve sem esses efeitos colaterais.

### 1.2 — Service

`src/services/camposPersonalizadosService.ts` (novo arquivo, único ponto de acesso à
tabela — segue a regra de fronteira de serviço do projeto):

- `listarDefinicoes(empresaId, entidade)` → linhas ativas de `campos_personalizados`,
  ordenadas por `ordem`.
- `salvarDefinicao` / `desativarDefinicao` (soft delete via `ativo = false`, nunca
  `DELETE` — dado histórico em `campos_extras` de registros antigos referencia a chave).
- `entidadeService.ts` ganha `campos_extras` no mapeamento de leitura/escrita já
  existente (linha ~6/~80), sem novo arquivo pra isso.

### 1.3 — UI

- Tela de administração (`src/pages/.../CamposPersonalizadosPage.tsx` — nome final segue
  convenção de rotas do projeto): CRUD simples da definição, escopo por empresa via
  `empresa_representada_id` do usuário logado.
- Formulário de cliente (onde já existe hoje): bloco final "Informações adicionais",
  renderizado a partir de `listarDefinicoes` — `switch(tipo)` pra 5 tipos fixos
  (texto/numero/data/booleano/selecao), cada um mapeado pro componente shadcn já usado
  no resto do form (`Input`, `Select`, `Checkbox`, date picker). Sem engine de schema
  genérico, sem lib nova — 5 `case` cobrem o requisito real.

Critério de pronto: usuário cria campo "Segmento" (seleção) pela tela de admin, ele
aparece no form de cliente sem deploy, valor salva em `campos_extras.segmento`.

---

## Fase 2 — Listagens configuráveis pelo usuário

**Estado: concluída no escopo piloto de Entidades.** A expansão para outras listas continua condicionada ao uso real do piloto.

Objetivo: atacar diretamente "facilidade do usuário com os artefatos" — ganho de UX
maior que dicionário de dados sozinho, e o documento original nem menciona isso.

- Tabela `preferencias_listagem` (`usuario_id`, `tela`, `colunas_visiveis jsonb`,
  `filtros_salvos jsonb`) — por usuário, não por empresa.
- Nas listagens já existentes (clientes, contas a pagar/receber, produtos): botão
  "Colunas" abre popover de toggle, persiste em `preferencias_listagem` via
  `upsert(onConflict: 'usuario_id,tela')` — checar constraint UNIQUE real antes de
  configurar o `onConflict` (armadilha já catalogada no `CLAUDE.md`).
- Campos personalizados da Fase 1 entram automaticamente como colunas disponíveis
  (mesma fonte: `campos_personalizados`).

Sem componente novo de tabela — mesmo `<Table>` shadcn atual, só filtra quais `<th>`/`<td>`
renderiza.

---

## Fase 3 — Webhooks configuráveis pelo usuário

**Estado: concluída no escopo incremental de `titulo.liquidado`.** Novos eventos só entram quando houver consumidor real.

Objetivo: versão útil do "barramento de eventos" do documento, sem Kafka/RabbitMQ —
volume do sistema não justifica fila dedicada; `pg_cron` + tabela de outbox já cobre.

- A tabela existente `webhook_configs` continua como fonte de destino, eventos e segredo.
  Reaproveita o mecanismo de assinatura HMAC que já existe no lado satélite
  (`edu-erp-webhook`) — mesma lib de assinatura, direção invertida.
- Evento inicial efetivamente entregue: `titulo.liquidado`. `titulo.criado` e
  `nfe.autorizada` foram adiados até existir consumidor, evitando contrato especulativo.
- Disparo: outbox pattern — trigger de banco insere em `webhook_outbox`, edge function
  agendada via `pg_cron` (minuto a minuto) processa pendentes e faz o POST. Evita chamar
  `fetch` dentro de trigger de banco (sem retry, sem observabilidade).
- O trigger fica em `liquidacoes_titulos`, ponto comum e atômico de todas as liquidações;
  a RPC financeira consolidada não foi duplicada nem reescrita.
- `webhook_deliveries` permanece exclusivo de chamadas recebidas; saídas não contaminam
  a idempotência e a observabilidade de entrada.
- A tela existente `Configurações → Webhooks` recebeu o novo evento, sem novo CRUD.
- Entrega usa corpo JSON estável e headers `x-source-system`, `x-empresa-id`,
  `x-webhook-event`, `x-webhook-delivery`, `x-webhook-attempt`,
  `x-webhook-timestamp` e `x-webhook-signature: sha256=<HMAC-SHA256>`.
- Para o Educacional, o mesmo HMAC também é enviado em `x-erp-signature` e o
  envelope segue o contrato já implantado (`receivable.paid` ou
  `receivable.partially_paid`). A correlação nasce no título como
  `novus-educacional:<organization_id>:<numero_documento>`.
- Em baixas parciais, `valor_pago` representa o acumulado recebido no título,
  não apenas o valor da última baixa.
- Retry exponencial: 1, 2, 4... minutos, limitado a uma hora e ao `max_tentativas` da
  configuração. Claims concorrentes usam `FOR UPDATE SKIP LOCKED`; processamento preso
  volta à fila após cinco minutos.
- Prova real em 2026-08-11: liquidação QA criada no ERP, entregue pelo cron com
  HTTP 200 na primeira tentativa e persistida no tenant correto do Educacional;
  todos os registros QA foram removidos depois da validação.

---

## Descartado (fora do escopo do sistema atual)

Não entram neste plano, sem necessidade de retomar depois a menos que mude o modelo de
negócio (ex.: vender versão on-premise pra cliente com banco próprio):

- Reescrita Java/Spring Boot / abstração multi-fornecedor de banco.
- Injeção de plugins via JAR externo.
- `ALTER TABLE` dinâmico disparado por metadado.
- Kafka/RabbitMQ.
- Front-end 100% renderizado por metadado (formulário genérico substituindo os forms
  atuais) — mantém UX pior que form dedicado com máscara/validação Zod.
- Troca de design system (Ant Design/Angular Material) — shadcn+Tailwind já cobre.

---

## Ordem recomendada

Fase 1 → validar com um cadastro real (entidades) → Fase 2 (barata, alto valor
percebido) → Fase 3 (só se houver demanda real de integração externa nova).

Cada fase é independente e reversível — nenhuma depende de dropar/renomear algo já
existente.
