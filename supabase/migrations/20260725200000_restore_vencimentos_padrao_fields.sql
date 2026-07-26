-- Mesmo padrao de descontos_padrao (20260725160000): FormVencimentoPadrao.tsx (tela
-- real de RH) grava codigo/incideInss/incideIrrf/incideFgts, nenhuma dessas colunas
-- existe em vencimentos_padrao hoje.

ALTER TABLE public.vencimentos_padrao
  ADD COLUMN IF NOT EXISTS codigo varchar(10),
  ADD COLUMN IF NOT EXISTS incide_inss boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS incide_irrf boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS incide_fgts boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_vencimentos_padrao_codigo ON public.vencimentos_padrao(codigo);
