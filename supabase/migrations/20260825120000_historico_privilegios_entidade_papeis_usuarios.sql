-- Consolidação de usuários/permissões (Fase 1): fecha o gap de auditoria de mudança de
-- privilégio. `historico_operacoes` existe mas é código morto (sem caller nenhum) — este
-- padrão copia o trigger funcional já usado em `historico_movimentacoes_bancarias`/
-- `historico_estoque_movimentacoes` (to_jsonb(OLD)/to_jsonb(NEW), automático, não depende
-- de código de app lembrar de chamar nada). Ver
-- C:\Users\maxwe\.claude\plans\vamos-consolidar-a-rela-o-mellow-grove.md, Fase 1.

-- ============================================================================
-- 1) historico_entidade_papeis — cobre qualquer papel (SOCIO/REPRESENTANTE_LEGAL/
--    PROCURADOR/COLABORADOR/CLIENTE/FORNECEDOR/PRESTADOR) numa tabela só, genérica.
-- ============================================================================

CREATE TABLE public.historico_entidade_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_papel_id uuid NOT NULL,
  entidade_id uuid NOT NULL,
  empresa_representada_id uuid NOT NULL,
  papel varchar NOT NULL,
  tipo_operacao varchar NOT NULL CHECK (tipo_operacao IN ('CRIACAO', 'EDICAO', 'ATIVACAO', 'DESATIVACAO', 'EXCLUSAO')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.historico_entidade_papeis TO authenticated;
GRANT ALL ON public.historico_entidade_papeis TO service_role;

ALTER TABLE public.historico_entidade_papeis ENABLE ROW LEVEL SECURITY;

-- Append-only: só SELECT tem policy — sem UPDATE/DELETE, mesmo padrão de
-- porta3_autorizacoes_excecao.
CREATE POLICY "historico_entidade_papeis_select"
  ON public.historico_entidade_papeis FOR SELECT TO authenticated
  USING (
    public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX idx_historico_entidade_papeis_entidade
  ON public.historico_entidade_papeis(entidade_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_historico_entidade_papel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_entidade_papeis (
      entidade_papel_id, entidade_id, empresa_representada_id, papel, tipo_operacao, dados_novos, usuario_id
    ) VALUES (
      NEW.id, NEW.entidade_id, NEW.empresa_representada_id, NEW.papel, 'CRIACAO', to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_entidade_papeis (
      entidade_papel_id, entidade_id, empresa_representada_id, papel, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES (
      NEW.id, NEW.entidade_id, NEW.empresa_representada_id, NEW.papel,
      CASE
        WHEN NEW.ativo = true AND OLD.ativo = false THEN 'ATIVACAO'
        WHEN NEW.ativo = false AND OLD.ativo = true THEN 'DESATIVACAO'
        ELSE 'EDICAO'
      END,
      to_jsonb(OLD), to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_entidade_papeis (
      entidade_papel_id, entidade_id, empresa_representada_id, papel, tipo_operacao, dados_anteriores, usuario_id
    ) VALUES (
      OLD.id, OLD.entidade_id, OLD.empresa_representada_id, OLD.papel, 'EXCLUSAO', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_historico_entidade_papeis
  AFTER INSERT OR UPDATE OR DELETE ON public.entidade_papeis
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_entidade_papel();

-- ============================================================================
-- 2) historico_usuarios_perfil — mudança de controle de acesso ao próprio ERP:
--    usuarios.perfil_id (perfis_acesso) e user_roles (admin/gerente/operador/
--    visualizador por empresa). `fonte` distingue as duas origens na mesma tabela.
-- ============================================================================

CREATE TABLE public.historico_usuarios_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte varchar NOT NULL CHECK (fonte IN ('usuarios.perfil_id', 'user_roles')),
  usuario_alvo_id uuid NOT NULL,
  empresa_representada_id uuid,
  tipo_operacao varchar NOT NULL CHECK (tipo_operacao IN ('CRIACAO', 'EDICAO', 'EXCLUSAO')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.historico_usuarios_perfil TO authenticated;
GRANT ALL ON public.historico_usuarios_perfil TO service_role;

ALTER TABLE public.historico_usuarios_perfil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_usuarios_perfil_select"
  ON public.historico_usuarios_perfil FOR SELECT TO authenticated
  USING (
    (empresa_representada_id IS NOT NULL AND public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX idx_historico_usuarios_perfil_alvo
  ON public.historico_usuarios_perfil(usuario_alvo_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_historico_usuario_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.perfil_id IS DISTINCT FROM OLD.perfil_id THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES (
      'usuarios.perfil_id', NEW.id, NEW.empresa_representada_id, 'EDICAO',
      jsonb_build_object('perfil_id', OLD.perfil_id),
      jsonb_build_object('perfil_id', NEW.perfil_id),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_historico_usuario_perfil
  AFTER UPDATE OF perfil_id ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_usuario_perfil();

CREATE OR REPLACE FUNCTION public.registrar_historico_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_novos, usuario_id
    ) VALUES ('user_roles', NEW.user_id, NEW.empresa_representada_id, 'CRIACAO', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES ('user_roles', NEW.user_id, NEW.empresa_representada_id, 'EDICAO', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_anteriores, usuario_id
    ) VALUES ('user_roles', OLD.user_id, OLD.empresa_representada_id, 'EXCLUSAO', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_historico_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_user_role();
