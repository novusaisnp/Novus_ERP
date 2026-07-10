
-- Bootstrap: permitir que qualquer usuário autenticado gerencie a configuração
-- da empresa (empresa_responsavel e empresas_representadas). As policies
-- anteriores exigiam papel 'admin', mas nenhum usuário possui esse papel,
-- o que fazia o salvamento falhar silenciosamente por RLS.

-- empresa_responsavel
DROP POLICY IF EXISTS "Authenticated podem gerenciar empresa_responsavel" ON public.empresa_responsavel;
CREATE POLICY "Authenticated podem gerenciar empresa_responsavel"
ON public.empresa_responsavel
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- empresas_representadas
DROP POLICY IF EXISTS "Authenticated podem gerenciar empresas_representadas" ON public.empresas_representadas;
CREATE POLICY "Authenticated podem gerenciar empresas_representadas"
ON public.empresas_representadas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Garantir GRANTs da Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_responsavel TO authenticated;
GRANT ALL ON public.empresa_responsavel TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_representadas TO authenticated;
GRANT ALL ON public.empresas_representadas TO service_role;
