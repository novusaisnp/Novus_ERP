CREATE TABLE IF NOT EXISTS public.preferencias_listagem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  tela text NOT NULL CHECK (tela = 'entidades'),
  colunas_visiveis jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(colunas_visiveis) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preferencias_listagem_usuario_empresa_tela_key
    UNIQUE (usuario_id, empresa_representada_id, tela)
);

GRANT SELECT, INSERT, UPDATE ON public.preferencias_listagem TO authenticated;
GRANT ALL ON public.preferencias_listagem TO service_role;

ALTER TABLE public.preferencias_listagem ENABLE ROW LEVEL SECURITY;

CREATE POLICY preferencias_listagem_select_own
  ON public.preferencias_listagem FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY preferencias_listagem_insert_own
  ON public.preferencias_listagem FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
    AND (
      empresa_representada_id = public.get_user_empresa_id()
      OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
    )
  );

CREATE POLICY preferencias_listagem_update_own
  ON public.preferencias_listagem FOR UPDATE TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (
    auth.uid() = usuario_id
    AND (
      empresa_representada_id = public.get_user_empresa_id()
      OR public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
    )
  );

CREATE TRIGGER trg_preferencias_listagem_updated_at
  BEFORE UPDATE ON public.preferencias_listagem
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
