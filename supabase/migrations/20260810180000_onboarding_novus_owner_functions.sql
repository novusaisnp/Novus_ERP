-- Wizard de onboarding de cliente novo (UI, não Studio) — 3 funções bridge pro schema
-- centelha isolado, mesmo padrão de get_empresas_disponiveis.

CREATE FUNCTION public.is_novus_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'novus_owner')
$$;

CREATE FUNCTION public.criar_responsavel_centelha(p_nome text, p_cnpj text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, centelha
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'novus_owner') THEN
    RAISE EXCEPTION 'Apenas operadores NOVUS podem criar responsáveis';
  END IF;
  INSERT INTO centelha.responsaveis (nome, cnpj) VALUES (p_nome, p_cnpj) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.listar_satelites_disponiveis()
RETURNS TABLE (id uuid, codigo text, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, centelha
AS $$
  SELECT s.id, s.codigo, s.nome FROM centelha.satelites s
  WHERE s.ativo = true AND public.has_role(auth.uid(), 'novus_owner')
$$;
