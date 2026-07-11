
-- 1) get_user_empresa_id: determinístico (ORDER BY created_at)
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT empresa_representada_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND empresa_representada_id IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- 2) Helper multi-tenant (EXISTS sobre todas as empresas do usuário)
CREATE OR REPLACE FUNCTION public.user_has_access_to_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND empresa_representada_id = _empresa_id
  )
$$;
REVOKE ALL ON FUNCTION public.user_has_access_to_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_access_to_empresa(uuid) TO authenticated, service_role;

-- 3) Modalidades / Naturezas: catálogos globais com leitura endurecida
DROP POLICY IF EXISTS modalidades_pagamento_select ON public.modalidades_pagamento;
CREATE POLICY modalidades_pagamento_select ON public.modalidades_pagamento
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS naturezas_pagamento_select ON public.naturezas_pagamento;
CREATE POLICY naturezas_pagamento_select ON public.naturezas_pagamento
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

COMMENT ON TABLE public.modalidades_pagamento IS
  'Catálogo global compartilhado (PIX, CREDIARIO_PROPRIO etc.). Referenciado por planos_pagamento e venda_pagamento em todos os tenants. Escrita restrita a admin; leitura autenticada.';
COMMENT ON TABLE public.naturezas_pagamento IS
  'Catálogo global compartilhado. Referenciado por planos_pagamento e venda_pagamento em todos os tenants. Escrita restrita a admin; leitura autenticada.';

-- 4) SECURITY DEFINER: reforçar checks internos nas RPCs
CREATE OR REPLACE FUNCTION public.get_audit_trail(p_movimentacao_id uuid)
RETURNS TABLE(id uuid, empresa_representada_id uuid, movimentacao_id uuid, conta_bancaria_id uuid, acao character varying, dados_anteriores jsonb, dados_novos jsonb, usuario_id uuid, ip_origem inet, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT h.empresa_representada_id INTO v_empresa
  FROM public.historico_movimentacoes_bancarias h
  WHERE h.movimentacao_id = p_movimentacao_id
  LIMIT 1;

  IF v_empresa IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.user_has_access_to_empresa(v_empresa) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT h.id, h.empresa_representada_id, h.movimentacao_id, h.conta_bancaria_id,
         h.acao, h.dados_anteriores, h.dados_novos, h.usuario_id, h.ip_origem, h.created_at
  FROM public.historico_movimentacoes_bancarias h
  WHERE h.movimentacao_id = p_movimentacao_id
  ORDER BY h.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_audit_trail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_trail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transferencia_bancaria_atomica(
  p_empresa_id uuid, p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric,
  p_data_lancamento date, p_descricao text, p_lote_descricao text,
  p_natureza_id uuid, p_plano_conta_id uuid, p_centro_custo_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lote_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied for empresa %', p_empresa_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lotes_movimentacoes (empresa_representada_id, tipo, descricao, valor_total, data_lancamento)
  VALUES (p_empresa_id, 'TRANSFERENCIA', p_lote_descricao, p_valor, p_data_lancamento)
  RETURNING id INTO v_lote_id;

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, lote_id, tipo, valor,
    data_lancamento, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_origem_id, v_lote_id, 'TRANSFERENCIA_SAIDA', p_valor,
    p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, lote_id, tipo, valor,
    data_lancamento, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_destino_id, v_lote_id, 'TRANSFERENCIA_ENTRADA', p_valor,
    p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  RETURN v_lote_id;
END;
$$;
REVOKE ALL ON FUNCTION public.transferencia_bancaria_atomica(uuid,uuid,uuid,numeric,date,text,text,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transferencia_bancaria_atomica(uuid,uuid,uuid,numeric,date,text,text,uuid,uuid,uuid) TO authenticated, service_role;

-- Comentários explicativos das funções que precisam permanecer executáveis
COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
  'SECURITY DEFINER exigido: bypass de RLS em user_roles para evitar recursão. EXECUTE authenticated é necessário pois é referenciada em policies RLS.';
COMMENT ON FUNCTION public.get_user_empresa_id() IS
  'SECURITY DEFINER exigido: leitura de user_roles em policies. Determinístico via ORDER BY created_at. Para checagens multi-tenant use user_has_access_to_empresa.';
COMMENT ON FUNCTION public.user_has_access_to_empresa(uuid) IS
  'Checagem multi-tenant via EXISTS. Use em policies quando o usuário pode pertencer a múltiplas empresas.';
COMMENT ON FUNCTION public.validar_pagamento_venda(uuid) IS
  'SECURITY DEFINER com validação interna (auth.uid + permissão de tenant). Retorna erros padronizados; nunca vaza dados de outros tenants.';
COMMENT ON FUNCTION public.get_audit_trail(uuid) IS
  'SECURITY DEFINER com validação interna: exige auth e acesso à empresa da movimentação.';
COMMENT ON FUNCTION public.transferencia_bancaria_atomica(uuid,uuid,uuid,numeric,date,text,text,uuid,uuid,uuid) IS
  'SECURITY DEFINER com validação interna: exige auth e acesso à empresa alvo.';
