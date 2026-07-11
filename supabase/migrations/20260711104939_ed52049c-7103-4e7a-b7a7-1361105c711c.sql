
-- =========================================================
-- FIN-E2: Política de pagamento e crédito por cliente
-- =========================================================

-- 1) cliente_politica_pagamento
CREATE TABLE IF NOT EXISTS public.cliente_politica_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL,
  cliente_id uuid NOT NULL UNIQUE REFERENCES public.clientes(id) ON DELETE CASCADE,
  permite_crediario boolean NOT NULL DEFAULT false,
  limite_crediario numeric(15,2) NOT NULL DEFAULT 0,
  limite_utilizado numeric(15,2) NOT NULL DEFAULT 0,
  dias_max_atraso integer NULL,
  status text NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','BLOQUEADO','EM_ANALISE')),
  motivo_bloqueio text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CHECK (limite_crediario >= 0),
  CHECK (limite_utilizado >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_politica_pagamento TO authenticated;
GRANT ALL ON public.cliente_politica_pagamento TO service_role;

ALTER TABLE public.cliente_politica_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpp_select_own_or_admin"
  ON public.cliente_politica_pagamento FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cpp_insert_own_or_admin"
  ON public.cliente_politica_pagamento FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cpp_update_own_or_admin"
  ON public.cliente_politica_pagamento FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cpp_delete_own_or_admin"
  ON public.cliente_politica_pagamento FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cpp_empresa_status
  ON public.cliente_politica_pagamento (empresa_representada_id, status);

CREATE TRIGGER update_cpp_updated_at
  BEFORE UPDATE ON public.cliente_politica_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) cliente_modalidades_bloqueadas
CREATE TABLE IF NOT EXISTS public.cliente_modalidades_bloqueadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  modalidade_id uuid NOT NULL REFERENCES public.modalidades_pagamento(id) ON DELETE CASCADE,
  motivo text NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, modalidade_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_modalidades_bloqueadas TO authenticated;
GRANT ALL ON public.cliente_modalidades_bloqueadas TO service_role;

ALTER TABLE public.cliente_modalidades_bloqueadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmb_select_own_or_admin"
  ON public.cliente_modalidades_bloqueadas FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cmb_insert_own_or_admin"
  ON public.cliente_modalidades_bloqueadas FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cmb_update_own_or_admin"
  ON public.cliente_modalidades_bloqueadas FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cmb_delete_own_or_admin"
  ON public.cliente_modalidades_bloqueadas FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_cmb_empresa_cliente
  ON public.cliente_modalidades_bloqueadas (empresa_representada_id, cliente_id);
