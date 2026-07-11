
CREATE TABLE public.orcamentos_venda_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos_venda(id) ON DELETE CASCADE,
  empresa_representada_id UUID NOT NULL,
  produto_id UUID NULL,
  servico_id UUID NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (preco_unitario >= 0),
  desconto NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0,
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orc_itens_orcamento ON public.orcamentos_venda_itens(orcamento_id);
CREATE INDEX idx_orc_itens_empresa ON public.orcamentos_venda_itens(empresa_representada_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos_venda_itens TO authenticated;
GRANT ALL ON public.orcamentos_venda_itens TO service_role;

ALTER TABLE public.orcamentos_venda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant select orc itens" ON public.orcamentos_venda_itens
FOR SELECT TO authenticated
USING (
  empresa_representada_id = public.get_user_empresa_id()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "tenant insert orc itens" ON public.orcamentos_venda_itens
FOR INSERT TO authenticated
WITH CHECK (
  (empresa_representada_id = public.get_user_empresa_id()
   OR public.has_role(auth.uid(), 'admin'))
  AND EXISTS (
    SELECT 1 FROM public.orcamentos_venda o
    WHERE o.id = orcamento_id
      AND o.empresa_representada_id = orcamentos_venda_itens.empresa_representada_id
  )
);

CREATE POLICY "tenant update orc itens" ON public.orcamentos_venda_itens
FOR UPDATE TO authenticated
USING (
  empresa_representada_id = public.get_user_empresa_id()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  empresa_representada_id = public.get_user_empresa_id()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "tenant delete orc itens" ON public.orcamentos_venda_itens
FOR DELETE TO authenticated
USING (
  empresa_representada_id = public.get_user_empresa_id()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_orcamentos_venda_itens_updated_at
BEFORE UPDATE ON public.orcamentos_venda_itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
