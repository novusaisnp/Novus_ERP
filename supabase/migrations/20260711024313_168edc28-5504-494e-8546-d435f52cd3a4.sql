
CREATE TABLE public.orcamentos_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  numero VARCHAR(30) NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviado','aprovado','recusado','expirado','cancelado','convertido')),
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(empresa_representada_id, numero)
);

CREATE INDEX idx_orcamentos_venda_empresa ON public.orcamentos_venda(empresa_representada_id);
CREATE INDEX idx_orcamentos_venda_cliente ON public.orcamentos_venda(cliente_id);
CREATE INDEX idx_orcamentos_venda_status ON public.orcamentos_venda(status);
CREATE INDEX idx_orcamentos_venda_numero ON public.orcamentos_venda(numero);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos_venda TO authenticated;
GRANT ALL ON public.orcamentos_venda TO service_role;

ALTER TABLE public.orcamentos_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orcamentos_venda_select_tenant" ON public.orcamentos_venda
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      empresa_representada_id = public.get_user_empresa_id()
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "orcamentos_venda_insert_tenant" ON public.orcamentos_venda
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_representada_id = public.get_user_empresa_id()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "orcamentos_venda_update_tenant" ON public.orcamentos_venda
  FOR UPDATE TO authenticated
  USING (
    empresa_representada_id = public.get_user_empresa_id()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    empresa_representada_id = public.get_user_empresa_id()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "orcamentos_venda_delete_admin" ON public.orcamentos_venda
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_orcamentos_venda_updated_at
  BEFORE UPDATE ON public.orcamentos_venda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
