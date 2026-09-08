-- PERM-1: bloco de checagem granular reutilizável.
-- Generaliza o padrão já provado em financeiro_pode (admin/novus_owner sempre
-- passam, senão reconfirma has_permissao no servidor) para qualquer código do
-- catálogo de perfis_acesso, sem precisar de uma função dedicada por módulo.

CREATE OR REPLACE FUNCTION public.pode(p_permissao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'novus_owner'::app_role)
      OR has_permissao(auth.uid(), p_permissao)
    );
$$;
REVOKE ALL ON FUNCTION public.pode(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode(text) TO authenticated;
COMMENT ON FUNCTION public.pode(text) IS
  'Checagem granular genérica de permissão do usuário atual (admin/novus_owner sempre passam, senão has_permissao). Building block para a UI consumir via RPC — nunca substitui a autorização real de cada RPC/Edge Function, só evita mostrar uma ação que o servidor vai recusar.';

-- Resolve várias permissões numa única chamada — evita N round-trips por tela
-- (mesma ideia de financeiro_permissoes(), generalizada).
CREATE OR REPLACE FUNCTION public.permissoes_usuario(p_codigos text[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    jsonb_object_agg(codigo, public.pode(codigo)),
    '{}'::jsonb
  )
  FROM unnest(p_codigos) AS codigo;
$$;
REVOKE ALL ON FUNCTION public.permissoes_usuario(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.permissoes_usuario(text[]) TO authenticated;
COMMENT ON FUNCTION public.permissoes_usuario(text[]) IS
  'Batch de public.pode() — resolve várias permissões do usuário atual numa única chamada de rede.';

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.pode(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.permissoes_usuario(text[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'PERM1_ACL_INVALIDA';
  END IF;
END;
$$;
