-- ORC-1: motor de alçadas mínimo (valor × categoria × empresa/filial × perfil),
-- segregação solicitante × aprovador, substituição temporária auditada.
-- Onda 1 do Mapa Mestre de Capacidades (docs/PLANO_MESTRE.md, Parte 3).
--
-- Escopo desta passada (docs/STATUS.md tem o detalhe completo):
-- motor genérico + tabelas + RPCs, sem nenhum consumidor real ainda — COMP-1
-- (compras) não existe, e a reautenticação pontual do Financeiro
-- (autorizacaoFinanceiraService.ts / edge function financeiro-autorizar) não foi
-- tocada nesta passada (deliberado: é um gate de segurança que já funciona hoje,
-- trocar por este motor é decisão separada, não incidental a esta migration).
-- Uma única faixa (não sequência de níveis) é resolvida por categoria+valor —
-- simplificação deliberada para o escopo "mínimo" do ORC-1; workflow sequencial
-- de múltiplos níveis fica para ORC-2/DOC-1 se houver caso real.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Configuração de alçadas (faixa de valor × categoria × permissão exigida)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.alcadas_aprovacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  categoria varchar NOT NULL,
  valor_minimo numeric(14, 2) NOT NULL DEFAULT 0 CHECK (valor_minimo >= 0),
  permissao_necessaria varchar NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_representada_id, categoria, valor_minimo)
);

CREATE INDEX alcadas_aprovacao_empresa_categoria_idx
  ON public.alcadas_aprovacao (empresa_representada_id, categoria, ativo);

CREATE TRIGGER trg_alcadas_aprovacao_updated_at
  BEFORE UPDATE ON public.alcadas_aprovacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.alcadas_aprovacao ENABLE ROW LEVEL SECURITY;

-- Leitura ampla (qualquer um com acesso à empresa vê as regras vigentes), escrita
-- restrita a admin — mesmo desenho de ativos_fixos.
CREATE POLICY alcadas_aprovacao_select ON public.alcadas_aprovacao
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY alcadas_aprovacao_insert ON public.alcadas_aprovacao
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY alcadas_aprovacao_update ON public.alcadas_aprovacao
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY alcadas_aprovacao_delete ON public.alcadas_aprovacao
  FOR DELETE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Substituição temporária de aprovador (auditada — quem registrou, por quê,
--    janela de validade). Não substitui a checagem de permissão do titular: o
--    substituto só herda a autoridade de aprovar enquanto o titular também a
--    detém (evita que uma substituição vire uma promoção de fato).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.alcadas_substitutos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  aprovador_titular_id uuid NOT NULL,
  aprovador_substituto_id uuid NOT NULL,
  categoria varchar,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  motivo text NOT NULL,
  criado_por uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data_fim >= data_inicio),
  CHECK (aprovador_titular_id <> aprovador_substituto_id)
);

CREATE INDEX alcadas_substitutos_lookup_idx
  ON public.alcadas_substitutos (empresa_representada_id, aprovador_substituto_id, data_inicio, data_fim);

ALTER TABLE public.alcadas_substitutos ENABLE ROW LEVEL SECURITY;

CREATE POLICY alcadas_substitutos_select ON public.alcadas_substitutos
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY alcadas_substitutos_insert ON public.alcadas_substitutos
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY alcadas_substitutos_update ON public.alcadas_substitutos
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY alcadas_substitutos_delete ON public.alcadas_substitutos
  FOR DELETE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Solicitações de aprovação — a própria trilha de auditoria (padrão
--    porta3_autorizacoes_excecao: GRANT SELECT apenas, escrita só via RPC
--    SECURITY DEFINER abaixo).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.solicitacoes_aprovacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  categoria varchar NOT NULL,
  valor numeric(14, 2) NOT NULL CHECK (valor >= 0),
  descricao text NOT NULL,
  contexto jsonb,
  origem_tabela varchar,
  origem_id uuid,
  solicitante_id uuid NOT NULL,
  alcada_id uuid REFERENCES public.alcadas_aprovacao(id),
  permissao_necessaria varchar,
  status varchar NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'AUTO_APROVADO')),
  decidido_por uuid,
  decidido_em timestamptz,
  justificativa_decisao text,
  substituicao_id uuid REFERENCES public.alcadas_substitutos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX solicitacoes_aprovacao_empresa_status_idx
  ON public.solicitacoes_aprovacao (empresa_representada_id, status, created_at DESC);
CREATE INDEX solicitacoes_aprovacao_solicitante_idx
  ON public.solicitacoes_aprovacao (solicitante_id, created_at DESC);
CREATE INDEX solicitacoes_aprovacao_origem_idx
  ON public.solicitacoes_aprovacao (origem_tabela, origem_id) WHERE origem_tabela IS NOT NULL;

GRANT SELECT ON public.solicitacoes_aprovacao TO authenticated;
GRANT ALL ON public.solicitacoes_aprovacao TO service_role;
ALTER TABLE public.solicitacoes_aprovacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY solicitacoes_aprovacao_select ON public.solicitacoes_aprovacao
  FOR SELECT TO authenticated
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. resolver_alcada: dado categoria+valor, encontra a faixa mais específica
--    (maior valor_minimo <= valor) ainda ativa para a empresa. NULL = nenhuma
--    alçada configurada para essa categoria/valor (não exige aprovação).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.resolver_alcada(p_empresa_id uuid, p_categoria text, p_valor numeric)
RETURNS public.alcadas_aprovacao
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.alcadas_aprovacao
  WHERE empresa_representada_id = p_empresa_id
    AND categoria = p_categoria
    AND ativo = true
    AND valor_minimo <= COALESCE(p_valor, 0)
  ORDER BY valor_minimo DESC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.resolver_alcada(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_alcada(uuid, text, numeric) TO authenticated, service_role;
COMMENT ON FUNCTION public.resolver_alcada(uuid, text, numeric) IS
  'ORC-1: resolve a faixa de alçada (maior valor_minimo <= valor) aplicável a uma categoria/valor na empresa. NULL = sem alçada configurada, não exige aprovação.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. solicitar_aprovacao: abre uma solicitação. Auto-aprova de cara se não há
--    alçada configurada para a categoria/valor (critério de saída do ORC-1 só
--    vale "acima da alçada configurada").
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.solicitar_aprovacao(
  p_empresa_id uuid,
  p_categoria text,
  p_valor numeric,
  p_descricao text,
  p_contexto jsonb DEFAULT NULL,
  p_origem_tabela text DEFAULT NULL,
  p_origem_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alcada public.alcadas_aprovacao;
  v_id uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN
    RAISE EXCEPTION 'VALOR_INVALIDO' USING ERRCODE = 'P0001';
  END IF;
  IF p_categoria IS NULL OR length(trim(p_categoria)) = 0 THEN
    RAISE EXCEPTION 'CATEGORIA_OBRIGATORIA' USING ERRCODE = 'P0001';
  END IF;
  IF p_descricao IS NULL OR length(trim(p_descricao)) = 0 THEN
    RAISE EXCEPTION 'DESCRICAO_OBRIGATORIA' USING ERRCODE = 'P0001';
  END IF;

  v_alcada := public.resolver_alcada(p_empresa_id, p_categoria, p_valor);
  v_status := CASE WHEN v_alcada.id IS NULL THEN 'AUTO_APROVADO' ELSE 'PENDENTE' END;

  INSERT INTO public.solicitacoes_aprovacao (
    empresa_representada_id, categoria, valor, descricao, contexto,
    origem_tabela, origem_id, solicitante_id, alcada_id, permissao_necessaria,
    status, decidido_em, justificativa_decisao
  ) VALUES (
    p_empresa_id, trim(p_categoria), p_valor, trim(p_descricao), p_contexto,
    p_origem_tabela, p_origem_id, auth.uid(), v_alcada.id, v_alcada.permissao_necessaria,
    v_status,
    CASE WHEN v_status = 'AUTO_APROVADO' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'AUTO_APROVADO' THEN 'Sem alçada configurada para esta categoria/valor.' ELSE NULL END
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'solicitacao_id', v_id, 'status', v_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitar_aprovacao(uuid, text, numeric, text, jsonb, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.solicitar_aprovacao(uuid, text, numeric, text, jsonb, text, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.solicitar_aprovacao(uuid, text, numeric, text, jsonb, text, uuid) IS
  'ORC-1: abre uma solicitação de aprovação. Auto-aprova quando não há alçada configurada para a categoria/valor.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. decidir_solicitacao: aprova/rejeita. Reconfirma permissão no servidor
--    (has_permissao, nunca confia no cliente), aceita substituição ativa, e
--    aplica segregação de funções de forma incondicional — quem abriu a
--    solicitação nunca pode decidi-la, nem mesmo admin.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.decidir_solicitacao(
  p_solicitacao_id uuid,
  p_decisao text,
  p_justificativa text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol public.solicitacoes_aprovacao;
  v_autorizado boolean := false;
  v_substituicao_id uuid := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_decisao NOT IN ('APROVADO', 'REJEITADO') THEN
    RAISE EXCEPTION 'DECISAO_INVALIDA: %', p_decisao USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_sol FROM public.solicitacoes_aprovacao WHERE id = p_solicitacao_id FOR UPDATE;
  IF v_sol IS NULL THEN
    RAISE EXCEPTION 'SOLICITACAO_NAO_ENCONTRADA' USING ERRCODE = 'P0001';
  END IF;
  -- Checagem grosseira de acesso (tenant) primeiro; autorização fina (permissão/
  -- substituição) só é avaliada depois de confirmar que a solicitação está viva
  -- e que quem chama nem é o próprio solicitante — nessa ordem, um chamador sem
  -- autoridade nenhuma não aprende detalhes de validação de negócio (ex.:
  -- exigência de justificativa) antes de passar pelo gate de acesso.
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(v_sol.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_sol.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'SOLICITACAO_JA_DECIDIDA' USING ERRCODE = 'P0001';
  END IF;

  -- Segregação de funções: quem solicitou nunca aprova/rejeita a própria solicitação.
  IF auth.uid() = v_sol.solicitante_id THEN
    RAISE EXCEPTION 'SEGREGACAO_FUNCOES: solicitante nao pode decidir a propria solicitacao' USING ERRCODE = '42501';
  END IF;

  v_autorizado := public.has_role_for_empresa(auth.uid(), 'admin', v_sol.empresa_representada_id)
    OR public.has_permissao(auth.uid(), v_sol.permissao_necessaria);

  IF NOT v_autorizado THEN
    SELECT id INTO v_substituicao_id
    FROM public.alcadas_substitutos
    WHERE empresa_representada_id = v_sol.empresa_representada_id
      AND aprovador_substituto_id = auth.uid()
      AND (categoria IS NULL OR categoria = v_sol.categoria)
      AND CURRENT_DATE BETWEEN data_inicio AND data_fim
      AND public.has_permissao(aprovador_titular_id, v_sol.permissao_necessaria)
    LIMIT 1;
    IF v_substituicao_id IS NOT NULL THEN
      v_autorizado := true;
    END IF;
  END IF;

  IF NOT v_autorizado THEN
    RAISE EXCEPTION 'PERMISSAO_INSUFICIENTE: %', COALESCE(v_sol.permissao_necessaria, '(nenhuma)') USING ERRCODE = '42501';
  END IF;

  IF p_decisao = 'REJEITADO' AND (p_justificativa IS NULL OR length(trim(p_justificativa)) = 0) THEN
    RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.solicitacoes_aprovacao
  SET status = p_decisao,
      decidido_por = auth.uid(),
      decidido_em = now(),
      justificativa_decisao = NULLIF(trim(COALESCE(p_justificativa, '')), ''),
      substituicao_id = v_substituicao_id
  WHERE id = p_solicitacao_id;

  RETURN jsonb_build_object('ok', true, 'status', p_decisao);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decidir_solicitacao(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decidir_solicitacao(uuid, text, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.decidir_solicitacao(uuid, text, text) IS
  'ORC-1: aprova/rejeita uma solicitação pendente. Reconfirma has_permissao (ou substituição ativa) no servidor. Segregação solicitante x aprovador incondicional, inclusive para admin.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. cancelar_solicitacao_aprovacao: só o próprio solicitante, só enquanto
--    pendente.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cancelar_solicitacao_aprovacao(p_solicitacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol public.solicitacoes_aprovacao;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sol FROM public.solicitacoes_aprovacao WHERE id = p_solicitacao_id FOR UPDATE;
  IF v_sol IS NULL THEN
    RAISE EXCEPTION 'SOLICITACAO_NAO_ENCONTRADA' USING ERRCODE = 'P0001';
  END IF;
  IF v_sol.solicitante_id <> auth.uid() THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_sol.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'SOLICITACAO_JA_DECIDIDA' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.solicitacoes_aprovacao
  SET status = 'CANCELADO', decidido_por = auth.uid(), decidido_em = now()
  WHERE id = p_solicitacao_id;

  RETURN jsonb_build_object('ok', true, 'status', 'CANCELADO');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancelar_solicitacao_aprovacao(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_solicitacao_aprovacao(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.cancelar_solicitacao_aprovacao(uuid) IS
  'ORC-1: cancela uma solicitação própria ainda pendente.';
