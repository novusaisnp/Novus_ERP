-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 3: baixa de estoque em vendas sempre usava
-- locais[0].id (a primeira localização retornada pela query, não uma
-- escolhida pelo usuário). Coluna aditiva e nullable — venda de serviço
-- puro, sem baixa de estoque, não precisa dela.
-- =====================================================================

ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS localizacao_estoque_id uuid REFERENCES public.localizacoes_estoque(id);
