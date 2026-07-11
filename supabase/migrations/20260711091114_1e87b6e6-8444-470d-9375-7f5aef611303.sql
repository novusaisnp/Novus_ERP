
-- 1. Adicionar colunas (nullable inicialmente para backfill)
ALTER TABLE public.orcamentos_venda
  ADD COLUMN IF NOT EXISTS tipo CHAR(1),
  ADD COLUMN IF NOT EXISTS versao INT NOT NULL DEFAULT 1;

ALTER TABLE public.orcamentos_venda_itens
  ADD COLUMN IF NOT EXISTS tipo_item CHAR(1);

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS tipo CHAR(1),
  ADD COLUMN IF NOT EXISTS orcamento_id UUID NULL REFERENCES public.orcamentos_venda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_fiscal TEXT NOT NULL DEFAULT 'PENDENTE';

ALTER TABLE public.itens_venda
  ADD COLUMN IF NOT EXISTS tipo_item CHAR(1);

-- 2. Backfill tipo_item nos itens
UPDATE public.orcamentos_venda_itens
SET tipo_item = CASE
  WHEN servico_id IS NOT NULL THEN 'S'
  ELSE 'P'
END
WHERE tipo_item IS NULL;

UPDATE public.itens_venda
SET tipo_item = CASE
  WHEN servico_id IS NOT NULL THEN 'S'
  ELSE 'P'
END
WHERE tipo_item IS NULL;

-- 3. Backfill tipo cabeçalho orçamentos com base nos itens
WITH agg AS (
  SELECT orcamento_id,
    bool_or(tipo_item = 'P') AS has_p,
    bool_or(tipo_item = 'S') AS has_s
  FROM public.orcamentos_venda_itens
  GROUP BY orcamento_id
)
UPDATE public.orcamentos_venda o
SET tipo = CASE
  WHEN a.has_p AND a.has_s THEN 'H'
  WHEN a.has_s THEN 'S'
  ELSE 'P'
END
FROM agg a
WHERE o.id = a.orcamento_id AND o.tipo IS NULL;

UPDATE public.orcamentos_venda SET tipo = 'P' WHERE tipo IS NULL;

-- 4. Backfill tipo cabeçalho vendas
WITH agg AS (
  SELECT venda_id,
    bool_or(tipo_item = 'P') AS has_p,
    bool_or(tipo_item = 'S') AS has_s
  FROM public.itens_venda
  GROUP BY venda_id
)
UPDATE public.vendas v
SET tipo = CASE
  WHEN a.has_p AND a.has_s THEN 'H'
  WHEN a.has_s THEN 'S'
  ELSE 'P'
END
FROM agg a
WHERE v.id = a.venda_id AND v.tipo IS NULL;

UPDATE public.vendas SET tipo = 'P' WHERE tipo IS NULL;

-- 5. Constraints e NOT NULL
ALTER TABLE public.orcamentos_venda
  ALTER COLUMN tipo SET NOT NULL,
  ADD CONSTRAINT orcamentos_venda_tipo_check CHECK (tipo IN ('P','S','H'));

ALTER TABLE public.orcamentos_venda_itens
  ALTER COLUMN tipo_item SET NOT NULL,
  ADD CONSTRAINT orcamentos_venda_itens_tipo_item_check CHECK (tipo_item IN ('P','S'));

ALTER TABLE public.vendas
  ALTER COLUMN tipo SET NOT NULL,
  ADD CONSTRAINT vendas_tipo_check CHECK (tipo IN ('P','S','H'));

ALTER TABLE public.itens_venda
  ALTER COLUMN tipo_item SET NOT NULL,
  ADD CONSTRAINT itens_venda_tipo_item_check CHECK (tipo_item IN ('P','S'));

-- 6. Índice único parcial: 1 venda no máximo por orçamento
CREATE UNIQUE INDEX IF NOT EXISTS vendas_orcamento_id_unique
  ON public.vendas(orcamento_id) WHERE orcamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orcamentos_venda_tipo_idx ON public.orcamentos_venda(tipo);
CREATE INDEX IF NOT EXISTS vendas_tipo_idx ON public.vendas(tipo);
CREATE INDEX IF NOT EXISTS vendas_status_fiscal_idx ON public.vendas(status_fiscal);
