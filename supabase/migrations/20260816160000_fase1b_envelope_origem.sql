-- =====================================================================
-- CONTRATOS_CANONICOS_ERP.md — Fase 1b: completar o envelope de
-- rastreabilidade (origem_sistema, origem_canal, externo_id,
-- idempotency_key, hash_payload) nas tabelas que ainda não têm.
--
-- Objetivo declarado pelo usuário (2026-08-16): o "engate rápido" precisa
-- valer pra qualquer dado processado no ERP, não importa a origem — via
-- satélite, via API externa (gateway de pagamento, etc.), ou nativo da
-- tela do ERP. Isso não depende de saber qual será o próximo satélite:
-- o envelope é genérico por desenho (todos os campos opcionais — um
-- registro criado direto na UI simplesmente não preenche nenhum deles).
--
-- Estado antes desta migration (conferido contra o banco real, não a
-- documentação — que já estava defasada em alguns pontos, ex.: `entidades`
-- já tinha o envelope completo e o doc ainda listava como pendente):
--   contas_pagar             — nada
--   vendas                   — só hash_payload
--   venda_pagamento_parcelas — só externo_id
--   liquidacoes_titulos      — só idempotency_key (+ índice único já existe)
--   produtos                 — nada
--   estoque_movimentacoes    — nada
-- =====================================================================

-- contas_pagar: Porta 1 funciona nos dois sentidos (contas_receber OU
-- contas_pagar, conforme CONTRATOS_CANONICOS_ERP.md §2) — só o lado
-- receber tinha o envelope.
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS origem_sistema   text,
  ADD COLUMN IF NOT EXISTS origem_canal     text,
  ADD COLUMN IF NOT EXISTS externo_id       text,
  ADD COLUMN IF NOT EXISTS idempotency_key  text,
  ADD COLUMN IF NOT EXISTS hash_payload     text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_pagar_idempotency
  ON public.contas_pagar (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

-- vendas: a tabela que syncVenda (sync-webhook) escreve — sem o envelope
-- completo, não tinha como aquele código funcionar direito.
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS origem_sistema   text,
  ADD COLUMN IF NOT EXISTS origem_canal     text,
  ADD COLUMN IF NOT EXISTS externo_id       text,
  ADD COLUMN IF NOT EXISTS idempotency_key  text;
  -- hash_payload já existe

CREATE UNIQUE INDEX IF NOT EXISTS ux_vendas_idempotency
  ON public.vendas (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

-- venda_pagamento_parcelas
ALTER TABLE public.venda_pagamento_parcelas
  ADD COLUMN IF NOT EXISTS origem_sistema   text,
  ADD COLUMN IF NOT EXISTS origem_canal     text,
  ADD COLUMN IF NOT EXISTS idempotency_key  text,
  ADD COLUMN IF NOT EXISTS hash_payload     text;
  -- externo_id já existe

CREATE UNIQUE INDEX IF NOT EXISTS ux_vpp_idempotency
  ON public.venda_pagamento_parcelas (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- liquidacoes_titulos (Porta 2) — índice único de idempotency_key já
-- existe (ux_liquidacoes_titulos_idempotency), só faltavam as colunas de
-- origem propriamente ditas.
ALTER TABLE public.liquidacoes_titulos
  ADD COLUMN IF NOT EXISTS origem_sistema   text,
  ADD COLUMN IF NOT EXISTS origem_canal     text,
  ADD COLUMN IF NOT EXISTS externo_id       text,
  ADD COLUMN IF NOT EXISTS hash_payload     text;

-- produtos (Porta 1, catálogo — ex.: PDV sincronizando seu cadastro)
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS origem_sistema   text,
  ADD COLUMN IF NOT EXISTS origem_canal     text,
  ADD COLUMN IF NOT EXISTS externo_id       text,
  ADD COLUMN IF NOT EXISTS idempotency_key  text,
  ADD COLUMN IF NOT EXISTS hash_payload     text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_produtos_idempotency
  ON public.produtos (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;

-- estoque_movimentacoes (Porta 1 — ex.: cada saída de balcão de um PDV)
ALTER TABLE public.estoque_movimentacoes
  ADD COLUMN IF NOT EXISTS origem_sistema   text,
  ADD COLUMN IF NOT EXISTS origem_canal     text,
  ADD COLUMN IF NOT EXISTS externo_id       text,
  ADD COLUMN IF NOT EXISTS idempotency_key  text,
  ADD COLUMN IF NOT EXISTS hash_payload     text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_estoque_mov_idempotency
  ON public.estoque_movimentacoes (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
