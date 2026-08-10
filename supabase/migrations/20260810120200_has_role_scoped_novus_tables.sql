-- Fix cirúrgico, não uma reescrita geral: has_role(uid,'admin') ignora
-- empresa_representada_id em todo o schema (158 ocorrências, padrão intencional pra
-- um operador único gerenciar várias empresas representadas). Isso deixa de ser
-- seguro só nas 3 tabelas que passam a hospedar dado comercial da própria NOVUS
-- (clientes/contratos/contas_receber, ver Centelha) — um admin de empresa cliente
-- não pode ler contrato/cobrança da NOVUS. As outras ~146 policies continuam
-- exatamente como estão, fora de escopo desta mudança.

CREATE OR REPLACE FUNCTION public.has_role_for_empresa(_user_id uuid, _role public.app_role, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'novus_owner')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
        AND empresa_representada_id = _empresa_id
    )
$$;

-- Contas hoje "admin global" (empresa_representada_id NULL) são, na prática, os
-- operadores da NOVUS — migradas pra novus_owner para não perder acesso a estas
-- 3 tabelas no mesmo passo em que o escopo é fechado.
INSERT INTO public.user_roles (user_id, role, empresa_representada_id)
SELECT DISTINCT user_id, 'novus_owner'::public.app_role, NULL::uuid
FROM public.user_roles
WHERE role = 'admin' AND empresa_representada_id IS NULL
ON CONFLICT DO NOTHING;

-- clientes
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));

-- contratos (update não tinha WITH CHECK no original — mantido igual)
DROP POLICY IF EXISTS "contratos_select" ON public.contratos;
DROP POLICY IF EXISTS "contratos_insert" ON public.contratos;
DROP POLICY IF EXISTS "contratos_update" ON public.contratos;
DROP POLICY IF EXISTS "contratos_delete" ON public.contratos;

CREATE POLICY "contratos_select" ON public.contratos FOR SELECT TO authenticated
  USING (empresa_representada_id = get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "contratos_insert" ON public.contratos FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "contratos_update" ON public.contratos FOR UPDATE TO authenticated
  USING (empresa_representada_id = get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "contratos_delete" ON public.contratos FOR DELETE TO authenticated
  USING (empresa_representada_id = get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));

-- contas_receber
DROP POLICY IF EXISTS "cr_select" ON public.contas_receber;
DROP POLICY IF EXISTS "cr_insert" ON public.contas_receber;
DROP POLICY IF EXISTS "cr_update" ON public.contas_receber;
DROP POLICY IF EXISTS "cr_delete" ON public.contas_receber;

CREATE POLICY "cr_select" ON public.contas_receber FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "cr_insert" ON public.contas_receber FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "cr_update" ON public.contas_receber FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "cr_delete" ON public.contas_receber FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
