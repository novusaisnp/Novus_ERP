-- FormDescontoPadrao.tsx (tela real de RH) grava codigo e tabela_progressiva -
-- nenhuma das duas existe na tabela descontos_padrao hoje.

ALTER TABLE public.descontos_padrao
  ADD COLUMN IF NOT EXISTS codigo varchar(10),
  ADD COLUMN IF NOT EXISTS tabela_progressiva jsonb;

CREATE INDEX IF NOT EXISTS idx_descontos_padrao_codigo ON public.descontos_padrao(codigo);
