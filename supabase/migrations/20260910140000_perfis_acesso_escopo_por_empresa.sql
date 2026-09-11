-- Achado na varredura de 2026-09-10 que seguiu o vazamento de empresa_responsavel
-- (mesmo checkpoint, ver STATUS.md): public.perfis_acesso nasceu sem NENHUMA coluna
-- de vínculo com empresa. As 3 linhas atuais (todas sistema=true) nunca expuseram
-- o problema porque nenhuma empresa ainda tinha criado um perfil customizado
-- (sistema=false) — mas a policy de SELECT era aberta a qualquer autenticado, e
-- INSERT/UPDATE/DELETE de perfil não-sistema era liberado a admin de QUALQUER
-- empresa, sem checar de quem é. usuarios.perfil_id referencia esta tabela — é o
-- que decide as permissões reais (`permissoes` jsonb) de cada usuário, então isso
-- não é cosmético.
--
-- Diferente de empresa_responsavel (1 linha por empresa, sempre vinculada), aqui
-- coexistem dois tipos de linha: perfis de sistema (globais, mesmo padrão já
-- confirmado intencional para papeis_catalogo/modalidades_pagamento/
-- naturezas_pagamento) e perfis customizados (por empresa, nunca globais). A coluna
-- fica nullable e uma CHECK garante a invariante: sistema=true <=> sem empresa,
-- sistema=false <=> sempre com empresa.

ALTER TABLE public.perfis_acesso
  ADD COLUMN IF NOT EXISTS empresa_representada_id uuid REFERENCES public.empresas_representadas(id);

DO $$
DECLARE
  v_custom_sem_empresa integer;
BEGIN
  SELECT count(*) INTO v_custom_sem_empresa
  FROM public.perfis_acesso WHERE NOT sistema AND empresa_representada_id IS NULL;
  IF v_custom_sem_empresa > 0 THEN
    RAISE EXCEPTION 'perfis_acesso: % perfil(is) customizado(s) sem empresa vinculada — backfill manual necessário antes de aplicar a CHECK', v_custom_sem_empresa;
  END IF;
END $$;

ALTER TABLE public.perfis_acesso
  ADD CONSTRAINT perfis_acesso_escopo_consistente
  CHECK (
    (sistema = true AND empresa_representada_id IS NULL)
    OR (sistema = false AND empresa_representada_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_perfis_acesso_empresa
  ON public.perfis_acesso (empresa_representada_id);

DROP POLICY IF EXISTS "perfis_acesso_select_auth" ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_admin_insert" ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_admin_update" ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_admin_delete" ON public.perfis_acesso;

-- SELECT: perfil de sistema continua visível a qualquer autenticado (mesmo
-- comportamento de antes); perfil customizado só é visível a admin da própria
-- empresa (novus_owner tem bypass embutido em has_role_for_empresa).
CREATE POLICY "perfis_acesso_select" ON public.perfis_acesso FOR SELECT TO authenticated
  USING (
    sistema = true
    OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
  );

-- INSERT: só cria perfil customizado da própria empresa — nunca sistema=true
-- (perfil de sistema é seed/migração, não ação de usuário).
CREATE POLICY "perfis_acesso_insert" ON public.perfis_acesso FOR INSERT TO authenticated
  WITH CHECK (
    sistema = false
    AND empresa_representada_id IS NOT NULL
    AND public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
  );

-- UPDATE/DELETE: mesma trava que já existia (nunca sistema=true), agora também
-- escopada pela empresa dona do perfil.
CREATE POLICY "perfis_acesso_update" ON public.perfis_acesso FOR UPDATE TO authenticated
  USING (
    sistema = false
    AND public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
  )
  WITH CHECK (
    sistema = false
    AND public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
  );

CREATE POLICY "perfis_acesso_delete" ON public.perfis_acesso FOR DELETE TO authenticated
  USING (
    sistema = false
    AND public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
  );
