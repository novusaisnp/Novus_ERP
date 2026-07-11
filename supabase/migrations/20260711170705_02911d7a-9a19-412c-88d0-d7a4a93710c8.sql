
-- 1) Tabela
CREATE TABLE public.rateios_contas_receber (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  conta_receber_id UUID NOT NULL REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  percentual NUMERIC,
  valor NUMERIC NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rateios_contas_receber_conta ON public.rateios_contas_receber(conta_receber_id);
CREATE INDEX idx_rateios_contas_receber_empresa ON public.rateios_contas_receber(empresa_representada_id);

-- 2) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rateios_contas_receber TO authenticated;
GRANT ALL ON public.rateios_contas_receber TO service_role;

-- 3) RLS
ALTER TABLE public.rateios_contas_receber ENABLE ROW LEVEL SECURITY;

-- 4) Policies (espelham rateios_contas_pagar)
CREATE POLICY rcr_select ON public.rateios_contas_receber
  FOR SELECT USING (
    (empresa_representada_id = public.get_user_empresa_id())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY rcr_insert ON public.rateios_contas_receber
  FOR INSERT WITH CHECK (
    (empresa_representada_id = public.get_user_empresa_id())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY rcr_update ON public.rateios_contas_receber
  FOR UPDATE USING (
    (empresa_representada_id = public.get_user_empresa_id())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (empresa_representada_id = public.get_user_empresa_id())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY rcr_delete ON public.rateios_contas_receber
  FOR DELETE USING (
    (empresa_representada_id = public.get_user_empresa_id())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 5) Trigger updated_at (usa função pública já existente)
CREATE TRIGGER trg_rateios_contas_receber_updated_at
  BEFORE UPDATE ON public.rateios_contas_receber
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
