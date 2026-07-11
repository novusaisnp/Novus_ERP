
-- SM1.5 — Hardening admin-only write em perfis_acesso e user_roles + grants mínimos
-- Nota: 'perfis' é tabela de perfil do usuário (own-row), permanece como está.
-- A tabela de perfis de acesso do sistema é 'perfis_acesso'.

-- ============ perfis_acesso ============
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS perfis_acesso_select              ON public.perfis_acesso;
DROP POLICY IF EXISTS perfis_acesso_admin_insert        ON public.perfis_acesso;
DROP POLICY IF EXISTS perfis_acesso_admin_update        ON public.perfis_acesso;
DROP POLICY IF EXISTS perfis_acesso_admin_delete        ON public.perfis_acesso;
DROP POLICY IF EXISTS perfis_acesso_admin_write         ON public.perfis_acesso;

CREATE POLICY perfis_acesso_select_auth ON public.perfis_acesso
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY perfis_acesso_admin_insert ON public.perfis_acesso
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY perfis_acesso_admin_update ON public.perfis_acesso
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND COALESCE(sistema, false) = false)
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND COALESCE(sistema, false) = false);

CREATE POLICY perfis_acesso_admin_delete ON public.perfis_acesso
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND COALESCE(sistema, false) = false);

-- ============ user_roles ============
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own            ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_select          ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert          ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update          ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete          ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_write           ON public.user_roles;

CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ Grants mínimos (privilégio mínimo; RLS enforce) ============
REVOKE ALL ON public.perfis_acesso FROM anon;
REVOKE ALL ON public.user_roles    FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_acesso TO authenticated;
GRANT ALL                            ON public.perfis_acesso TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL                            ON public.user_roles TO service_role;

-- perfis (perfil do usuário): manter own-row; garantir grants explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL                            ON public.perfis TO service_role;
REVOKE ALL ON public.perfis FROM anon;
