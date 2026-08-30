-- ORG-1: grupo econômico → empresa legal → estabelecimento (matriz/filial)
-- Fundação da Onda 1 do Mapa Mestre de Capacidades (docs/PLANO_MESTRE.md, Parte 3).
-- empresas_representadas continua representando a empresa legal (todas as FKs existentes
-- se mantêm) — este migration só adiciona a camada acima (grupo econômico, opcional) e
-- abaixo (estabelecimento, obrigatório: toda empresa ganha ao menos uma MATRIZ).

-- 1. Grupo econômico (agrupamento opcional de empresas_representadas)
CREATE TABLE public.grupos_economicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar NOT NULL,
  cnpj_raiz varchar,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas_representadas
  ADD COLUMN grupo_economico_id uuid REFERENCES public.grupos_economicos(id);

CREATE INDEX empresas_representadas_grupo_economico_idx
  ON public.empresas_representadas (grupo_economico_id);

-- 2. Estabelecimento (matriz/filial de uma empresa legal)
CREATE TABLE public.estabelecimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  tipo varchar NOT NULL DEFAULT 'FILIAL',
  nome varchar NOT NULL,
  cnpj varchar,
  inscricao_estadual varchar,
  email varchar,
  telefone varchar,
  endereco text,
  cidade varchar,
  estado varchar,
  cep varchar,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estabelecimentos_empresa_idx
  ON public.estabelecimentos (empresa_representada_id);

-- Só uma MATRIZ por empresa legal.
CREATE UNIQUE INDEX estabelecimentos_matriz_unica
  ON public.estabelecimentos (empresa_representada_id)
  WHERE tipo = 'MATRIZ';

CREATE TRIGGER trg_grupos_economicos_updated_at
  BEFORE UPDATE ON public.grupos_economicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_estabelecimentos_updated_at
  BEFORE UPDATE ON public.estabelecimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Invariante: toda empresa legal sempre tem uma MATRIZ — criada automaticamente,
-- não depende de nenhum caminho de código (UI, onboarding-create-org,
-- centelha-provisiona-cliente) lembrar de fazer isso.
CREATE OR REPLACE FUNCTION public.criar_estabelecimento_matriz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.estabelecimentos (
    empresa_representada_id, tipo, nome, cnpj, email, telefone,
    endereco, cidade, estado, cep, ativo
  ) VALUES (
    NEW.id, 'MATRIZ', NEW.nome, NEW.cnpj, NEW.email, NEW.telefone,
    NEW.endereco, NEW.cidade, NEW.estado, NEW.cep, NEW.ativo
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresas_representadas_matriz
  AFTER INSERT ON public.empresas_representadas
  FOR EACH ROW EXECUTE FUNCTION public.criar_estabelecimento_matriz();

-- Função é SECURITY DEFINER só para o trigger funcionar independente de quem insere a
-- empresa; não deve ser chamável direto via RPC (mesmo padrão do Bloco 1.4 da Auditoria
-- de agosto/2026, Parte 2).
REVOKE EXECUTE ON FUNCTION public.criar_estabelecimento_matriz() FROM anon, authenticated;

-- Backfill: empresas já existentes ganham a MATRIZ que ainda não tinham.
INSERT INTO public.estabelecimentos (
  empresa_representada_id, tipo, nome, cnpj, email, telefone,
  endereco, cidade, estado, cep, ativo
)
SELECT id, 'MATRIZ', nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo
FROM public.empresas_representadas er
WHERE NOT EXISTS (
  SELECT 1 FROM public.estabelecimentos e
  WHERE e.empresa_representada_id = er.id AND e.tipo = 'MATRIZ'
);

-- 4. RLS
ALTER TABLE public.grupos_economicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estabelecimentos ENABLE ROW LEVEL SECURITY;

-- grupos_economicos: criar/apagar é decisão cross-tenant, mesmo padrão de
-- empresas_representadas (novus_owner exclusivo). Ver/editar é liberado para admin de
-- qualquer empresa já vinculada ao grupo.
CREATE POLICY grupos_economicos_select ON public.grupos_economicos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas_representadas er
      WHERE er.grupo_economico_id = grupos_economicos.id
        AND (
          public.user_has_access_to_empresa(er.id)
          OR public.has_role_for_empresa((select auth.uid()), 'admin', er.id)
        )
    )
  );

CREATE POLICY grupos_economicos_update ON public.grupos_economicos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas_representadas er
      WHERE er.grupo_economico_id = grupos_economicos.id
        AND public.has_role_for_empresa((select auth.uid()), 'admin', er.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empresas_representadas er
      WHERE er.grupo_economico_id = grupos_economicos.id
        AND public.has_role_for_empresa((select auth.uid()), 'admin', er.id)
    )
  );

CREATE POLICY grupos_economicos_insert ON public.grupos_economicos
  FOR INSERT
  WITH CHECK (public.has_role((select auth.uid()), 'novus_owner'));

CREATE POLICY grupos_economicos_delete ON public.grupos_economicos
  FOR DELETE
  USING (public.has_role((select auth.uid()), 'novus_owner'));

-- estabelecimentos: leitura para qualquer usuário com acesso à empresa (precisa aparecer
-- em seletores operacionais); escrita restrita a admin da empresa (estrutural/legal,
-- mesmo nível de sensibilidade de editar a própria empresas_representadas).
CREATE POLICY estabelecimentos_select ON public.estabelecimentos
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY estabelecimentos_insert ON public.estabelecimentos
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY estabelecimentos_update ON public.estabelecimentos
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY estabelecimentos_delete ON public.estabelecimentos
  FOR DELETE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));
