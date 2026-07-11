
-- ACC-CAT-1: Vínculo contábil de categorias (receita já existe; adicionar despesa)

ALTER TABLE public.categorias_produtos
  ADD COLUMN IF NOT EXISTS plano_conta_despesa_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN IF NOT EXISTS centro_custo_despesa_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS natureza_despesa_id uuid REFERENCES public.naturezas_pagamento(id);

CREATE INDEX IF NOT EXISTS idx_categorias_produtos_pc_desp ON public.categorias_produtos(plano_conta_despesa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_produtos_cc_desp ON public.categorias_produtos(centro_custo_despesa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_produtos_nat_desp ON public.categorias_produtos(natureza_despesa_id);

ALTER TABLE public.empresas_representadas
  ADD COLUMN IF NOT EXISTS plano_conta_despesa_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN IF NOT EXISTS centro_custo_despesa_default_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN IF NOT EXISTS natureza_despesa_default_id uuid REFERENCES public.naturezas_pagamento(id);

-- Trigger: categoria ativa exige classificação de receita e despesa
CREATE OR REPLACE FUNCTION public.validar_classificacao_categoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo = true THEN
    IF NEW.plano_conta_receita_id IS NULL THEN
      RAISE EXCEPTION 'CATEGORIA_SEM_CLASSIFICACAO_RECEITA: categoria ativa exige plano de contas de receita'
        USING ERRCODE = 'P0001';
    END IF;
    IF NEW.plano_conta_despesa_id IS NULL THEN
      RAISE EXCEPTION 'CATEGORIA_SEM_CLASSIFICACAO_DESPESA: categoria ativa exige plano de contas de despesa'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_classificacao_categoria() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_validar_classificacao_categoria ON public.categorias_produtos;
CREATE TRIGGER trg_validar_classificacao_categoria
  BEFORE INSERT OR UPDATE ON public.categorias_produtos
  FOR EACH ROW EXECUTE FUNCTION public.validar_classificacao_categoria();
