
-- 1) Tabela socios_representantes
CREATE TABLE public.socios_representantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  cpf varchar,
  email varchar,
  telefone varchar,
  tipo varchar NOT NULL CHECK (tipo IN ('SOCIO','REPRESENTANTE_LEGAL','PROCURADOR')),
  participacao_percentual numeric(5,2),
  cargo_societario varchar,
  documento_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_socios_empresa ON public.socios_representantes(empresa_representada_id);
CREATE UNIQUE INDEX uq_socios_empresa_cpf_ativo
  ON public.socios_representantes(empresa_representada_id, cpf)
  WHERE deleted_at IS NULL AND cpf IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.socios_representantes TO authenticated;
GRANT ALL ON public.socios_representantes TO service_role;

ALTER TABLE public.socios_representantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "socios_select_empresa" ON public.socios_representantes
  FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "socios_insert_empresa" ON public.socios_representantes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "socios_update_empresa" ON public.socios_representantes
  FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "socios_delete_empresa" ON public.socios_representantes
  FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_socios_updated_at
  BEFORE UPDATE ON public.socios_representantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Vínculo obrigatório em usuarios
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS pessoa_tipo varchar CHECK (pessoa_tipo IN ('COLABORADOR','SOCIO')),
  ADD COLUMN IF NOT EXISTS colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS socio_id uuid REFERENCES public.socios_representantes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS pessoa_pendente boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_usuarios_colaborador ON public.usuarios(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_socio ON public.usuarios(socio_id);

-- 1 usuário por pessoa (ativo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_colaborador
  ON public.usuarios(colaborador_id) WHERE colaborador_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_socio
  ON public.usuarios(socio_id) WHERE socio_id IS NOT NULL;

-- XOR: exatamente um vínculo, coerente com pessoa_tipo (ou pendente)
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_pessoa_xor_chk CHECK (
    pessoa_pendente = true
    OR (
      (pessoa_tipo = 'COLABORADOR' AND colaborador_id IS NOT NULL AND socio_id IS NULL)
      OR (pessoa_tipo = 'SOCIO' AND socio_id IS NOT NULL AND colaborador_id IS NULL)
    )
  ) NOT VALID;

-- 3) Backfill: usuários existentes ficam como pendentes
UPDATE public.usuarios SET pessoa_pendente = true
 WHERE colaborador_id IS NULL AND socio_id IS NULL;
