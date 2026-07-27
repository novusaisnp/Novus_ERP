-- Vendedor/operador responsável pela venda (backlog da avaliação de mercado do
-- módulo de Vendas, 2026-07-27, item "b"). Aponta para usuarios (não direto para
-- auth.users nem colaboradores): só usuarios carrega empresa_representada_id
-- junto e garante, via a constraint XOR de docs/CONTRATOS_CANONICOS_ERP.md §7,
-- que é sempre uma pessoa real da empresa. Nullable e aditiva: vendas antigas
-- ficam com vendedor_id NULL ("não informado"), sem backfill necessário.
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON public.vendas(vendedor_id);
