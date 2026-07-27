
-- ============================================================
-- Porta 3 (docs/CONTRATOS_CANONICOS_ERP.md §6): pré-checagem e
-- autorização de exceção de crédito/inadimplência antes de uma
-- venda a prazo. Segue o formato padrão de preflightResponseSchema
-- (supabase/functions/_shared/canonical/preflight.ts).
-- ============================================================

-- 1) has_permissao: checagem granular de permissão no servidor.
-- Complementa has_role (papéis) para RPCs que precisam reconfirmar
-- uma permissão específica do perfil do usuário (usuarios.perfil_id
-- -> perfis_acesso.permissoes) — nunca confiar na alegação do
-- cliente/satélite de que o usuário tem a permissão.
CREATE OR REPLACE FUNCTION public.has_permissao(p_user_id uuid, p_permissao text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    JOIN public.perfis_acesso pa ON pa.id = u.perfil_id
    WHERE u.user_id = p_user_id
      AND u.ativo = true
      AND pa.ativo = true
      AND pa.permissoes ? p_permissao
  )
$$;
REVOKE ALL ON FUNCTION public.has_permissao(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permissao(uuid, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.has_permissao(uuid, text) IS
  'SECURITY DEFINER: checagem granular de permissão (usuarios.perfil_id -> perfis_acesso.permissoes jsonb). Usada por RPCs que precisam reconfirmar uma permissão específica no servidor.';

-- 2) Auditoria das exceções concedidas (padrão historico_* já usado
-- em Estoque/Gestão Bancária: GRANT SELECT apenas, escrita só via
-- RPC SECURITY DEFINER abaixo).
CREATE TABLE public.porta3_autorizacoes_excecao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  bloqueio_codigo text NOT NULL,
  valor_pretendido numeric(15,2),
  permissao_utilizada text NOT NULL,
  justificativa text NOT NULL,
  usuario_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.porta3_autorizacoes_excecao TO authenticated;
GRANT ALL ON public.porta3_autorizacoes_excecao TO service_role;
ALTER TABLE public.porta3_autorizacoes_excecao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "porta3_excecao_select"
  ON public.porta3_autorizacoes_excecao FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_porta3_excecao_empresa_cliente
  ON public.porta3_autorizacoes_excecao(empresa_representada_id, cliente_id, created_at DESC);

-- 3) verificar_autorizacao_venda: pré-checagem síncrona (Porta 3, caso 2).
-- Cruza cliente_politica_pagamento (status/limite/dias_max_atraso) com
-- títulos vencidos em contas_receber. Assinatura fixada pelo contrato
-- documentado em §6 — não recebe modalidade de pagamento; quem decide
-- QUANDO chamar (só em venda a prazo/crediário) é o caller.
CREATE OR REPLACE FUNCTION public.verificar_autorizacao_venda(
  p_cliente_id uuid, p_empresa_id uuid, p_valor_pretendido numeric
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_politica record;
  v_tem_politica boolean;
  v_valor_vencido numeric(15,2);
  v_dias_max integer;
  v_bloqueios jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id = p_cliente_id AND empresa_representada_id = p_empresa_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'CLIENTE_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_politica
  FROM public.cliente_politica_pagamento
  WHERE cliente_id = p_cliente_id AND deleted_at IS NULL;
  v_tem_politica := FOUND;

  IF v_tem_politica AND v_politica.status = 'BLOQUEADO' THEN
    v_bloqueios := v_bloqueios || jsonb_build_array(jsonb_build_object(
      'codigo', 'CLIENTE_BLOQUEADO',
      'motivo', COALESCE(v_politica.motivo_bloqueio, 'Cliente bloqueado para crediário.'),
      'pode_ser_superado', true,
      'permissao_necessaria', 'vendas.autorizarInadimplencia'
    ));
  ELSIF v_tem_politica AND v_politica.status = 'EM_ANALISE' THEN
    v_bloqueios := v_bloqueios || jsonb_build_array(jsonb_build_object(
      'codigo', 'CLIENTE_EM_ANALISE',
      'motivo', 'Cadastro de crédito do cliente está em análise.',
      'pode_ser_superado', true,
      'permissao_necessaria', 'vendas.autorizarInadimplencia'
    ));
  END IF;

  v_dias_max := CASE WHEN v_tem_politica THEN v_politica.dias_max_atraso ELSE NULL END;

  SELECT COALESCE(SUM(valor_original - COALESCE(valor_recebido, 0)), 0)
  INTO v_valor_vencido
  FROM public.contas_receber
  WHERE cliente_id = p_cliente_id
    AND empresa_representada_id = p_empresa_id
    AND deleted_at IS NULL
    AND status IN ('PENDENTE', 'PARCIAL', 'VENCIDO')
    AND data_vencimento < CURRENT_DATE
    AND (v_dias_max IS NULL OR (CURRENT_DATE - data_vencimento) > v_dias_max);

  IF v_valor_vencido > 0 THEN
    v_bloqueios := v_bloqueios || jsonb_build_array(jsonb_build_object(
      'codigo', 'CLIENTE_INADIMPLENTE',
      'motivo', format('Cliente possui R$ %s em títulos vencidos e não pagos.',
        to_char(v_valor_vencido, 'FM999G999G999D00')),
      'pode_ser_superado', true,
      'permissao_necessaria', 'vendas.autorizarInadimplencia'
    ));
  END IF;

  IF v_tem_politica AND v_politica.permite_crediario
     AND (COALESCE(v_politica.limite_utilizado, 0) + COALESCE(p_valor_pretendido, 0)) > v_politica.limite_crediario THEN
    v_bloqueios := v_bloqueios || jsonb_build_array(jsonb_build_object(
      'codigo', 'LIMITE_CREDIARIO_EXCEDIDO',
      'motivo', format('Limite de crediário excedido: limite R$ %s, já utilizado R$ %s, nova venda R$ %s.',
        to_char(v_politica.limite_crediario, 'FM999G999G999D00'),
        to_char(v_politica.limite_utilizado, 'FM999G999G999D00'),
        to_char(COALESCE(p_valor_pretendido, 0), 'FM999G999G999D00')),
      'pode_ser_superado', true,
      'permissao_necessaria', 'vendas.autorizarInadimplencia'
    ));
  END IF;

  RETURN jsonb_build_object(
    'autorizado', jsonb_array_length(v_bloqueios) = 0,
    'bloqueios', v_bloqueios
  );
END;
$$;
REVOKE ALL ON FUNCTION public.verificar_autorizacao_venda(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verificar_autorizacao_venda(uuid, uuid, numeric) TO authenticated, service_role;
COMMENT ON FUNCTION public.verificar_autorizacao_venda(uuid, uuid, numeric) IS
  'Porta 3 (docs/CONTRATOS_CANONICOS_ERP.md §6): pré-checagem síncrona de crédito/inadimplência antes de uma venda a prazo. Resposta no formato preflightResponseSchema. SECURITY DEFINER com validação interna de tenant.';

-- 4) autorizar_excecao_venda: registra a exceção de um bloqueio
-- superável. Reconfirma a permissão no servidor via has_permissao —
-- nunca confia na alegação do satélite/cliente — e grava auditoria.
CREATE OR REPLACE FUNCTION public.autorizar_excecao_venda(
  p_cliente_id uuid, p_empresa_id uuid, p_bloqueio_codigo text,
  p_valor_pretendido numeric, p_justificativa text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_permissao text := 'vendas.autorizarInadimplencia';
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_bloqueio_codigo NOT IN ('CLIENTE_BLOQUEADO', 'CLIENTE_EM_ANALISE', 'CLIENTE_INADIMPLENTE', 'LIMITE_CREDIARIO_EXCEDIDO') THEN
    RAISE EXCEPTION 'BLOQUEIO_DESCONHECIDO: %', p_bloqueio_codigo USING ERRCODE = 'P0001';
  END IF;
  IF p_justificativa IS NULL OR length(trim(p_justificativa)) = 0 THEN
    RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_permissao(auth.uid(), v_permissao) THEN
    RAISE EXCEPTION 'PERMISSAO_INSUFICIENTE: %', v_permissao USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.clientes
    WHERE id = p_cliente_id AND empresa_representada_id = p_empresa_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'CLIENTE_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.porta3_autorizacoes_excecao (
    empresa_representada_id, cliente_id, bloqueio_codigo, valor_pretendido,
    permissao_utilizada, justificativa, usuario_id
  ) VALUES (
    p_empresa_id, p_cliente_id, p_bloqueio_codigo, p_valor_pretendido,
    v_permissao, trim(p_justificativa), auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'autorizado_id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.autorizar_excecao_venda(uuid, uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.autorizar_excecao_venda(uuid, uuid, text, numeric, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.autorizar_excecao_venda(uuid, uuid, text, numeric, text) IS
  'Porta 3 (§6): registra a exceção de um bloqueio superável retornado por verificar_autorizacao_venda. Reconfirma has_permissao no servidor e grava auditoria em porta3_autorizacoes_excecao.';
