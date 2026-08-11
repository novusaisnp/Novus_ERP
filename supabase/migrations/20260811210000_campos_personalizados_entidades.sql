ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS campos_extras jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.campos_personalizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  entidade text NOT NULL DEFAULT 'entidades' CHECK (entidade = 'entidades'),
  chave text NOT NULL CHECK (chave ~ '^[a-z][a-z0-9_]*$'),
  rotulo text NOT NULL CHECK (btrim(rotulo) <> ''),
  tipo text NOT NULL CHECK (tipo IN ('texto', 'numero', 'data', 'booleano', 'selecao')),
  opcoes jsonb,
  obrigatorio boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campos_personalizados_empresa_entidade_chave_key
    UNIQUE (empresa_representada_id, entidade, chave),
  CONSTRAINT campos_personalizados_opcoes_chk CHECK (
    (tipo = 'selecao' AND jsonb_typeof(opcoes) = 'array' AND jsonb_array_length(opcoes) > 0)
    OR (tipo <> 'selecao' AND opcoes IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_campos_personalizados_empresa_entidade_ordem
  ON public.campos_personalizados (empresa_representada_id, entidade, ordem, rotulo);

GRANT SELECT, INSERT, UPDATE ON public.campos_personalizados TO authenticated;
GRANT ALL ON public.campos_personalizados TO service_role;

ALTER TABLE public.campos_personalizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY campos_personalizados_select
  ON public.campos_personalizados FOR SELECT TO authenticated
  USING (
    empresa_representada_id = public.get_user_empresa_id()
    OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
  );

CREATE POLICY campos_personalizados_insert_admin
  ON public.campos_personalizados FOR INSERT TO authenticated
  WITH CHECK (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));

CREATE POLICY campos_personalizados_update_admin
  ON public.campos_personalizados FOR UPDATE TO authenticated
  USING (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id));

CREATE TRIGGER trg_campos_personalizados_updated_at
  BEFORE UPDATE ON public.campos_personalizados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
