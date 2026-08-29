-- Fecha a metade que faltava do gap de auditoria de privilégio (a outra metade,
-- historico_usuarios_perfil, já existe desde 20260825120000). Mesmo padrão de trigger
-- funcional (to_jsonb(OLD)/to_jsonb(NEW), automático, não depende de código de app
-- lembrar de chamar nada) já usado em historico_movimentacoes_bancarias/
-- historico_entidade_papeis/historico_usuarios_perfil. Ver
-- C:\Users\maxwe\.claude\plans\fancy-painting-mochi.md, passo 5.
--
-- Trigger em entidade_dados_colaborador, não numa tabela "colaboradores" -- essa
-- tabela foi dropada no cutover 20260810231500_backfill_cutover_socios_colaboradores.sql;
-- entidade_dados_colaborador é a única fonte de verdade hoje pro cargo de um colaborador.

CREATE TABLE public.historico_colaboradores_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id uuid NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.historico_colaboradores_cargo TO authenticated;
GRANT ALL ON public.historico_colaboradores_cargo TO service_role;

ALTER TABLE public.historico_colaboradores_cargo ENABLE ROW LEVEL SECURITY;

-- Append-only: só SELECT tem policy -- sem UPDATE/DELETE, mesmo padrão de
-- historico_entidade_papeis/historico_usuarios_perfil.
CREATE POLICY "historico_colaboradores_cargo_select"
  ON public.historico_colaboradores_cargo FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entidades e WHERE e.id = entidade_id
        AND (public.has_role_for_empresa(auth.uid(), 'admin', e.empresa_representada_id)
             OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE INDEX idx_historico_colaboradores_cargo_entidade
  ON public.historico_colaboradores_cargo(entidade_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_historico_colaborador_cargo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.historico_colaboradores_cargo (
    entidade_id, dados_anteriores, dados_novos, usuario_id
  ) VALUES (
    NEW.entidade_id,
    jsonb_build_object('cargo_id', OLD.cargo_id, 'departamento_id', OLD.departamento_id, 'setor_id', OLD.setor_id),
    jsonb_build_object('cargo_id', NEW.cargo_id, 'departamento_id', NEW.departamento_id, 'setor_id', NEW.setor_id),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_historico_colaboradores_cargo
  AFTER UPDATE OF cargo_id, departamento_id, setor_id ON public.entidade_dados_colaborador
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_colaborador_cargo();
