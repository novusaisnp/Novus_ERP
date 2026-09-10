-- Passo 2 do achado de 2026-09-10 (passo 1: 20260910120000, stopgap novus_owner-only).
-- public.empresa_responsavel nasceu como singleton global (nunca teve coluna de
-- vínculo com empresa) porque, até a E2E TEST CO existir, só havia uma empresa
-- (Allegra) no sistema inteiro — todo admin era, por acaso, admin dela. Isso deixa
-- de valer assim que existe mais de um tenant: a tabela precisa do mesmo padrão de
-- escopo por empresa usado no resto do sistema (has_role_for_empresa, ver
-- 20260810120200_has_role_scoped_novus_tables.sql), não só um bypass pra novus_owner.
--
-- Regra do usuário (2026-09-10): "uma empresa jamais ver os dados de uma outra";
-- só novusaisnp@gmail.com (novus_owner) tem visão cross-empresa, e mesmo assim só
-- da empresa que ele escolher no seletor ativo por vez — nunca de todas ao mesmo
-- tempo. has_role_for_empresa já dá bypass de RLS pro novus_owner (rede de
-- segurança, igual ao resto do sistema); quem garante "só a empresa escolhida" é o
-- filtro explícito por empresa ativa no service (empresaResponsavelService.ts),
-- não a ausência de RLS.

ALTER TABLE public.empresa_responsavel
  ADD COLUMN IF NOT EXISTS empresa_representada_id uuid REFERENCES public.empresas_representadas(id);

-- Backfill: hoje só existe 1 linha (o cadastro real da Allegra) — vincula pelo CNPJ,
-- que já é a mesma lógica de match usada em EmpresasRepresentadasList.tsx pra
-- detectar MESMA_EMPRESA.
UPDATE public.empresa_responsavel er
SET empresa_representada_id = rep.id
FROM public.empresas_representadas rep
WHERE er.empresa_representada_id IS NULL
  AND rep.cnpj = er.cnpj;

-- Trava de sanidade: se o backfill acima não conseguiu vincular alguma linha
-- (CNPJ divergente entre as duas tabelas), a migration para aqui em vez de deixar
-- a NOT NULL seguinte quebrar sem contexto.
DO $$
DECLARE
  v_orfas integer;
BEGIN
  SELECT count(*) INTO v_orfas FROM public.empresa_responsavel WHERE empresa_representada_id IS NULL;
  IF v_orfas > 0 THEN
    RAISE EXCEPTION 'empresa_responsavel: % linha(s) sem CNPJ correspondente em empresas_representadas — backfill manual necessário antes de aplicar NOT NULL', v_orfas;
  END IF;
END $$;

ALTER TABLE public.empresa_responsavel
  ALTER COLUMN empresa_representada_id SET NOT NULL;

-- Uma "empresa responsável" por empresa representada — é um cadastro (CNPJ,
-- endereço, config fiscal), não um histórico.
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresa_responsavel_empresa
  ON public.empresa_responsavel (empresa_representada_id);

CREATE INDEX IF NOT EXISTS idx_empresa_responsavel_empresa
  ON public.empresa_responsavel (empresa_representada_id);

DROP POLICY IF EXISTS "novus_owner_select_empresa_responsavel" ON public.empresa_responsavel;
DROP POLICY IF EXISTS "novus_owner_insert_empresa_responsavel" ON public.empresa_responsavel;
DROP POLICY IF EXISTS "novus_owner_update_empresa_responsavel" ON public.empresa_responsavel;
DROP POLICY IF EXISTS "novus_owner_delete_empresa_responsavel" ON public.empresa_responsavel;

-- Mesma semântica das policies originais (só admin lê/escreve, nenhum colaborador
-- comum), agora escopada por empresa em vez de global.
CREATE POLICY "empresa_responsavel_select" ON public.empresa_responsavel FOR SELECT TO authenticated
  USING (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "empresa_responsavel_insert" ON public.empresa_responsavel FOR INSERT TO authenticated
  WITH CHECK (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "empresa_responsavel_update" ON public.empresa_responsavel FOR UPDATE TO authenticated
  USING (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
CREATE POLICY "empresa_responsavel_delete" ON public.empresa_responsavel FOR DELETE TO authenticated
  USING (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));
