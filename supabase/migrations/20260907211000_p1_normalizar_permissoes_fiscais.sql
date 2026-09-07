-- Mantém fiscal.* como namespace canônico sem retirar acesso de perfis existentes.
ALTER TABLE public.perfis_acesso DISABLE TRIGGER trg_protect_perfis_sistema;

UPDATE public.perfis_acesso AS perfil
SET permissoes = (
  SELECT jsonb_agg(codigo ORDER BY primeira_posicao) AS permissoes
  FROM (
    SELECT codigo, min(posicao) AS primeira_posicao
    FROM (
      SELECT
        CASE permissao
          WHEN 'nfe.create' THEN 'fiscal.create'
          WHEN 'nfe.read' THEN 'fiscal.read'
          WHEN 'nfe.update' THEN 'fiscal.update'
          WHEN 'nfe.cancel' THEN 'fiscal.cancelarNfe'
          ELSE permissao
        END AS codigo,
        posicao
      FROM jsonb_array_elements_text(COALESCE(perfil.permissoes, '[]'::jsonb))
        WITH ORDINALITY AS atual(permissao, posicao)
    ) mapeadas
    GROUP BY codigo
  ) unicas
)
WHERE perfil.permissoes ?| ARRAY['nfe.create', 'nfe.read', 'nfe.update', 'nfe.cancel'];

ALTER TABLE public.perfis_acesso ENABLE TRIGGER trg_protect_perfis_sistema;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.perfis_acesso
    WHERE permissoes ?| ARRAY['nfe.create', 'nfe.read', 'nfe.update', 'nfe.cancel']
  ) THEN
    RAISE EXCEPTION 'P1_PERMISSOES_NFE_LEGADAS_RESTANTES';
  END IF;
END;
$$;
