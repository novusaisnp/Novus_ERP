-- FIN-8: trilha de auditoria real (não existia) para as duas mudanças mais sensíveis
-- que ainda não deixavam rastro: o que um perfil de acesso concede (permissoes/nome/
-- ativo) e dados de conta bancária (vetor clássico de fraude — redirecionar pra onde o
-- dinheiro vai). Mesmo padrão já comprovado em `historico_usuarios_perfil`/
-- `historico_entidade_papeis` (20260825120000): tabela append-only, trigger automático
-- to_jsonb(OLD)/to_jsonb(NEW), não depende de nenhum código de app lembrar de chamar
-- nada.

-- ============================================================================
-- 1) historico_perfis_acesso
-- ============================================================================

CREATE TABLE public.historico_perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL,
  empresa_representada_id uuid,
  tipo_operacao varchar NOT NULL CHECK (tipo_operacao IN ('EDICAO')),
  dados_anteriores jsonb NOT NULL,
  dados_novos jsonb NOT NULL,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.historico_perfis_acesso TO authenticated;
GRANT ALL ON public.historico_perfis_acesso TO service_role;

ALTER TABLE public.historico_perfis_acesso ENABLE ROW LEVEL SECURITY;

-- Append-only: só SELECT tem policy — sem UPDATE/DELETE.
CREATE POLICY "historico_perfis_acesso_select"
  ON public.historico_perfis_acesso FOR SELECT TO authenticated
  USING (
    (empresa_representada_id IS NOT NULL AND public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX idx_historico_perfis_acesso_perfil
  ON public.historico_perfis_acesso(perfil_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_historico_perfil_acesso()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.permissoes IS DISTINCT FROM OLD.permissoes
     OR NEW.nome IS DISTINCT FROM OLD.nome
     OR NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    INSERT INTO public.historico_perfis_acesso (
      perfil_id, empresa_representada_id, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES (
      NEW.id, NEW.empresa_representada_id, 'EDICAO',
      jsonb_build_object('nome', OLD.nome, 'ativo', OLD.ativo, 'permissoes', OLD.permissoes),
      jsonb_build_object('nome', NEW.nome, 'ativo', NEW.ativo, 'permissoes', NEW.permissoes),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_historico_perfis_acesso
  AFTER UPDATE OF permissoes, nome, ativo ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_perfil_acesso();

-- ============================================================================
-- 2) historico_contas_bancarias
-- ============================================================================

CREATE TABLE public.historico_contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_bancaria_id uuid NOT NULL,
  empresa_representada_id uuid NOT NULL,
  tipo_operacao varchar NOT NULL CHECK (tipo_operacao IN ('EDICAO')),
  dados_anteriores jsonb NOT NULL,
  dados_novos jsonb NOT NULL,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.historico_contas_bancarias TO authenticated;
GRANT ALL ON public.historico_contas_bancarias TO service_role;

ALTER TABLE public.historico_contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_contas_bancarias_select"
  ON public.historico_contas_bancarias FOR SELECT TO authenticated
  USING (
    public.has_role_for_empresa(auth.uid(), 'admin', empresa_representada_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX idx_historico_contas_bancarias_conta
  ON public.historico_contas_bancarias(conta_bancaria_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_historico_conta_bancaria()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.historico_contas_bancarias (
    conta_bancaria_id, empresa_representada_id, tipo_operacao, dados_anteriores, dados_novos, usuario_id
  ) VALUES (
    NEW.id, NEW.empresa_representada_id, 'EDICAO', to_jsonb(OLD), to_jsonb(NEW), auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_historico_contas_bancarias
  AFTER UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_conta_bancaria();
