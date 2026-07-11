
DROP POLICY IF EXISTS "cfop_admin_write" ON public.cfop;
DROP POLICY IF EXISTS "ncm_admin_write" ON public.ncm;

CREATE POLICY "cfop_admin_insert" ON public.cfop
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cfop_admin_update" ON public.cfop
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cfop_admin_delete" ON public.cfop
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ncm_admin_insert" ON public.ncm
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ncm_admin_update" ON public.ncm
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ncm_admin_delete" ON public.ncm
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
