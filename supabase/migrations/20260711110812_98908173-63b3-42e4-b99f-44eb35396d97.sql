
-- ============ A) RLS HARDENING: remove USING true genérico ============
DROP POLICY IF EXISTS "Authenticated podem gerenciar empresas_representadas" ON public.empresas_representadas;
DROP POLICY IF EXISTS "Authenticated podem gerenciar empresa_responsavel" ON public.empresa_responsavel;

-- cfop / ncm: leitura só para autenticados (sem 'true' literal)
DROP POLICY IF EXISTS cfop_read_authenticated ON public.cfop;
CREATE POLICY cfop_read_authenticated ON public.cfop
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS ncm_read_authenticated ON public.ncm;
CREATE POLICY ncm_read_authenticated ON public.ncm
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- ============ B) perfis_acesso: só admin cria/edita/exclui ============
DROP POLICY IF EXISTS "Authenticated can read perfis_acesso" ON public.perfis_acesso;
DROP POLICY IF EXISTS "Authenticated can insert perfis_acesso" ON public.perfis_acesso;
DROP POLICY IF EXISTS "Authenticated can update non-system perfis_acesso" ON public.perfis_acesso;
DROP POLICY IF EXISTS "Authenticated can delete non-system perfis_acesso" ON public.perfis_acesso;

CREATE POLICY perfis_acesso_select ON public.perfis_acesso
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY perfis_acesso_admin_insert ON public.perfis_acesso
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY perfis_acesso_admin_update ON public.perfis_acesso
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND COALESCE(sistema,false) = false)
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND COALESCE(sistema,false) = false);

CREATE POLICY perfis_acesso_admin_delete ON public.perfis_acesso
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND COALESCE(sistema,false) = false);

-- ============ C) user_roles: bloquear autoatribuição ============
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

-- ============ D) orcamentos_venda: DELETE tenant-based ============
DROP POLICY IF EXISTS orcamentos_venda_delete_admin ON public.orcamentos_venda;
CREATE POLICY orcamentos_venda_delete_tenant ON public.orcamentos_venda
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR empresa_representada_id = public.get_user_empresa_id()
  );

-- filhos: itens já têm tenant-based por FK, mas garantimos policy explícita
DROP POLICY IF EXISTS "tenant delete orc itens" ON public.orcamentos_venda_itens;
CREATE POLICY orcamentos_venda_itens_delete_tenant ON public.orcamentos_venda_itens
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.orcamentos_venda o
      WHERE o.id = orcamentos_venda_itens.orcamento_id
        AND o.empresa_representada_id = public.get_user_empresa_id()
    )
  );

-- ============ E) Storage: enforce path por empresa ============
DROP POLICY IF EXISTS "Authenticated read empresa-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write empresa-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update empresa-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete empresa-logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read empresa-certificados" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write empresa-certificados" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update empresa-certificados" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete empresa-certificados" ON storage.objects;

CREATE POLICY "empresa buckets tenant read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('empresa-logos','empresa-certificados')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
    )
  );

CREATE POLICY "empresa buckets tenant insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('empresa-logos','empresa-certificados')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
    )
  );

CREATE POLICY "empresa buckets tenant update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('empresa-logos','empresa-certificados')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
    )
  )
  WITH CHECK (
    bucket_id IN ('empresa-logos','empresa-certificados')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
    )
  );

CREATE POLICY "empresa buckets tenant delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('empresa-logos','empresa-certificados')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = public.get_user_empresa_id()::text
    )
  );

-- ============ F) SECURITY DEFINER: revoke EXECUTE de PUBLIC/anon ============
-- Funções triggers-only: revogar de todos exceto owner
REVOKE ALL ON FUNCTION public.atualizar_saldo_conta_movimentacao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_transferencia_movimentacao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_historico_movimentacao() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_perfis_sistema() FROM PUBLIC, anon, authenticated;

-- Funções usadas em policies (precisam de EXECUTE para authenticated)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_empresa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_empresa_id() TO authenticated, service_role;

-- RPCs chamadas pelo app
REVOKE ALL ON FUNCTION public.get_audit_trail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_trail(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.transferencia_bancaria_atomica(uuid,uuid,uuid,numeric,date,text,text,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transferencia_bancaria_atomica(uuid,uuid,uuid,numeric,date,text,text,uuid,uuid,uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.validar_pagamento_venda(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_pagamento_venda(uuid) TO authenticated, service_role;
