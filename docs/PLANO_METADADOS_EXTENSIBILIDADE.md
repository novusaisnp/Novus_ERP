# Plano — Campos personalizados, extensibilidade e usabilidade de artefatos

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

CREATE INDEX IF NOT EXISTS idx_campos_extras_gin ON entidades USING gin (campos_extras);
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

Objetivo: versão útil do "barramento de eventos" do documento, sem Kafka/RabbitMQ —
volume do sistema não justifica fila dedicada; `pg_cron` + tabela de outbox já cobre.

- Tabela `webhooks_config` (`empresa_representada_id`, `evento`, `url`, `segredo`,
  `ativo`). Reaproveita o mecanismo de assinatura HMAC que já existe no lado satélite
  (`edu-erp-webhook`) — mesma lib de assinatura, direção invertida.
- Eventos iniciais: `titulo.criado`, `titulo.liquidado`, `nfe.autorizada` (já existem
  como pontos de mutação nos services/edge functions atuais — só adicionar o disparo).
- Disparo: outbox pattern — trigger de banco insere em `webhooks_outbound`, edge function
  agendada via `pg_cron` (minuto a minuto) processa pendentes e faz o POST. Evita chamar
  `fetch` dentro de trigger de banco (sem retry, sem observabilidade).
- Tela de admin: CRUD de `webhooks_config`, sem SDK de plugin.

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
