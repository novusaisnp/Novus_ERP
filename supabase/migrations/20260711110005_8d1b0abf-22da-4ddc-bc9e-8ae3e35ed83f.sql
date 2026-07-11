
-- =========================================================
-- FIN-E3: venda_pagamento + parcelas + validador
-- =========================================================

-- 1) venda_pagamento
CREATE TABLE IF NOT EXISTS public.venda_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  modalidade_id uuid NOT NULL REFERENCES public.modalidades_pagamento(id),
  plano_pagamento_id uuid NULL REFERENCES public.planos_pagamento(id),
  natureza_id uuid NULL REFERENCES public.naturezas_pagamento(id),
  plano_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  valor_bruto numeric(15,2) NOT NULL CHECK (valor_bruto >= 0),
  valor_desconto numeric(15,2) NOT NULL DEFAULT 0 CHECK (valor_desconto >= 0),
  valor_juros numeric(15,2) NOT NULL DEFAULT 0 CHECK (valor_juros >= 0),
  valor_liquido numeric(15,2) NOT NULL,
  qtd_parcelas integer NOT NULL DEFAULT 1 CHECK (qtd_parcelas >= 1),
  percentual_entrada numeric(6,3) NOT NULL DEFAULT 0 CHECK (percentual_entrada >= 0 AND percentual_entrada <= 100),
  autorizacao_nsu text NULL,
  bandeira text NULL,
  adquirente text NULL,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE','AUTORIZADO','CAPTURADO','ESTORNADO_PARCIAL','ESTORNADO_TOTAL','FALHOU')),
  origem_canal text NOT NULL DEFAULT 'ERP'
    CHECK (origem_canal IN ('ERP','PDV','ECOM','API')),
  origem_sistema text NULL,
  externo_id text NULL,
  idempotency_key text NULL,
  hash_payload text NULL,
  operador_id uuid NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT vp_valor_liquido_coerente
    CHECK (valor_liquido = valor_bruto - valor_desconto + valor_juros)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_pagamento TO authenticated;
GRANT ALL ON public.venda_pagamento TO service_role;

ALTER TABLE public.venda_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vp_select_own_or_admin"
  ON public.venda_pagamento FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vp_insert_own_or_admin"
  ON public.venda_pagamento FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vp_update_own_or_admin"
  ON public.venda_pagamento FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vp_delete_own_or_admin"
  ON public.venda_pagamento FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_vp_venda ON public.venda_pagamento (venda_id);
CREATE INDEX IF NOT EXISTS idx_vp_empresa_status ON public.venda_pagamento (empresa_representada_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_vp_origem_externo
  ON public.venda_pagamento (origem_sistema, externo_id)
  WHERE externo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_vp_venda_idem
  ON public.venda_pagamento (venda_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER update_vp_updated_at
  BEFORE UPDATE ON public.venda_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) venda_pagamento_parcelas
CREATE TABLE IF NOT EXISTS public.venda_pagamento_parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL,
  venda_pagamento_id uuid NOT NULL REFERENCES public.venda_pagamento(id) ON DELETE CASCADE,
  numero integer NOT NULL CHECK (numero >= 1),
  valor numeric(15,2) NOT NULL CHECK (valor >= 0),
  valor_juros numeric(15,2) NOT NULL DEFAULT 0 CHECK (valor_juros >= 0),
  data_vencimento date NOT NULL,
  is_entrada boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ABERTA'
    CHECK (status IN ('ABERTA','LIQUIDADA_PARCIAL','LIQUIDADA','CANCELADA')),
  externo_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venda_pagamento_id, numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_pagamento_parcelas TO authenticated;
GRANT ALL ON public.venda_pagamento_parcelas TO service_role;

ALTER TABLE public.venda_pagamento_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vpp_select_own_or_admin"
  ON public.venda_pagamento_parcelas FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vpp_insert_own_or_admin"
  ON public.venda_pagamento_parcelas FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vpp_update_own_or_admin"
  ON public.venda_pagamento_parcelas FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vpp_delete_own_or_admin"
  ON public.venda_pagamento_parcelas FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_vpp_pagamento ON public.venda_pagamento_parcelas (venda_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_vpp_vencto_aberta
  ON public.venda_pagamento_parcelas (data_vencimento)
  WHERE status = 'ABERTA';

CREATE TRIGGER update_vpp_updated_at
  BEFORE UPDATE ON public.venda_pagamento_parcelas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) função validar_pagamento_venda
CREATE OR REPLACE FUNCTION public.validar_pagamento_venda(p_venda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda           record;
  v_empresa_atual   uuid;
  v_is_admin        boolean;
  v_erros           jsonb := '[]'::jsonb;
  v_avisos          jsonb := '[]'::jsonb;
  v_soma_pag        numeric(15,2);
  v_tolerancia      numeric(6,3) := 0.02;
  v_politica        record;
  v_credi_natureza  uuid;
  v_lp              record;
  v_soma_parc       numeric(15,2);
  v_qtd_parc        integer;
  v_vencto_ant      date;
  v_parc            record;
  v_mono_ok         boolean;
BEGIN
  -- venda + tenant
  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erros', jsonb_build_array(jsonb_build_object(
        'codigo','VENDA_NAO_ENCONTRADA','categoria','TENANT','mensagem','Venda não encontrada'
      )),
      'avisos', '[]'::jsonb
    );
  END IF;

  v_empresa_atual := public.get_user_empresa_id();
  v_is_admin := public.has_role(auth.uid(), 'admin');
  IF NOT v_is_admin AND (v_empresa_atual IS NULL OR v_empresa_atual <> v_venda.empresa_representada_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erros', jsonb_build_array(jsonb_build_object(
        'codigo','PERM_DENIED','categoria','PERMISSAO','mensagem','Sem permissão para validar esta venda'
      )),
      'avisos', '[]'::jsonb
    );
  END IF;

  -- soma linhas de pagamento vs total venda
  SELECT COALESCE(SUM(valor_liquido),0) INTO v_soma_pag
  FROM public.venda_pagamento
  WHERE venda_id = p_venda_id AND deleted_at IS NULL;

  IF abs(v_soma_pag - v_venda.valor_total) > v_tolerancia THEN
    v_erros := v_erros || jsonb_build_object(
      'codigo','DIVERGENCIA_TOTAL','categoria','TOTAL',
      'mensagem', format('Soma de pagamentos (%s) difere do total da venda (%s)', v_soma_pag, v_venda.valor_total),
      'campo','valor_liquido'
    );
  END IF;

  -- política do cliente
  SELECT * INTO v_politica FROM public.cliente_politica_pagamento
  WHERE cliente_id = v_venda.cliente_id AND deleted_at IS NULL;

  IF FOUND AND v_politica.status = 'BLOQUEADO' THEN
    v_erros := v_erros || jsonb_build_object(
      'codigo','CLIENTE_BLOQUEADO','categoria','POLITICA',
      'mensagem', COALESCE(v_politica.motivo_bloqueio,'Cliente bloqueado para vendas')
    );
  END IF;

  SELECT id INTO v_credi_natureza FROM public.naturezas_pagamento
  WHERE codigo = 'CREDIARIO_PROPRIO' AND deleted_at IS NULL LIMIT 1;

  -- por linha de pagamento
  FOR v_lp IN
    SELECT vp.*, m.permite_parcelamento, m.nome AS modalidade_nome
    FROM public.venda_pagamento vp
    JOIN public.modalidades_pagamento m ON m.id = vp.modalidade_id
    WHERE vp.venda_id = p_venda_id AND vp.deleted_at IS NULL
  LOOP
    -- modalidade bloqueada para este cliente
    IF EXISTS (
      SELECT 1 FROM public.cliente_modalidades_bloqueadas b
      WHERE b.cliente_id = v_venda.cliente_id AND b.modalidade_id = v_lp.modalidade_id
    ) THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','MODALIDADE_BLOQUEADA','categoria','MODALIDADE',
        'mensagem', format('Modalidade %s bloqueada para este cliente', v_lp.modalidade_nome),
        'campo','modalidade_id'
      );
    END IF;

    -- crediário sem limite
    IF v_credi_natureza IS NOT NULL AND v_lp.natureza_id = v_credi_natureza THEN
      IF NOT FOUND OR v_politica IS NULL OR NOT v_politica.permite_crediario THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','CREDIARIO_SEM_LIMITE','categoria','POLITICA',
          'mensagem','Cliente não possui crediário habilitado'
        );
      ELSIF v_lp.valor_liquido > (v_politica.limite_crediario - v_politica.limite_utilizado) THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','CREDIARIO_SEM_LIMITE','categoria','POLITICA',
          'mensagem', format('Valor %s excede limite disponível %s',
            v_lp.valor_liquido, (v_politica.limite_crediario - v_politica.limite_utilizado))
        );
      END IF;
    END IF;

    -- modalidade sem parcelamento
    IF NOT v_lp.permite_parcelamento AND v_lp.qtd_parcelas > 1 THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','MODALIDADE_SEM_PARCELAMENTO','categoria','MODALIDADE',
        'mensagem', format('Modalidade %s não permite parcelamento', v_lp.modalidade_nome),
        'campo','qtd_parcelas'
      );
    END IF;

    -- plano inativo/expirado
    IF v_lp.plano_pagamento_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.planos_pagamento pp
        WHERE pp.id = v_lp.plano_pagamento_id AND pp.deleted_at IS NULL AND pp.ativo = true
          AND (pp.vigencia_inicio IS NULL OR pp.vigencia_inicio <= CURRENT_DATE)
          AND (pp.vigencia_fim IS NULL OR pp.vigencia_fim >= CURRENT_DATE)
      ) THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','PLANO_INATIVO_OU_EXPIRADO','categoria','PLANO',
          'mensagem','Plano de pagamento inativo ou fora da vigência',
          'campo','plano_pagamento_id'
        );
      END IF;
    END IF;

    -- soma parcelas + monotonicidade + quantidade
    SELECT COALESCE(SUM(valor),0), COUNT(*) INTO v_soma_parc, v_qtd_parc
    FROM public.venda_pagamento_parcelas
    WHERE venda_pagamento_id = v_lp.id;

    IF v_qtd_parc <> v_lp.qtd_parcelas THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','PARCELAS_QTD','categoria','PARCELA',
        'mensagem', format('Quantidade de parcelas (%s) diferente do informado (%s)', v_qtd_parc, v_lp.qtd_parcelas),
        'campo','qtd_parcelas'
      );
    END IF;

    IF abs(v_soma_parc - v_lp.valor_liquido) > v_tolerancia THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','DIVERGENCIA_PARCELAS','categoria','PARCELA',
        'mensagem', format('Soma das parcelas (%s) difere do valor da linha (%s)', v_soma_parc, v_lp.valor_liquido)
      );
    END IF;

    v_vencto_ant := NULL;
    v_mono_ok := true;
    FOR v_parc IN
      SELECT * FROM public.venda_pagamento_parcelas
      WHERE venda_pagamento_id = v_lp.id
      ORDER BY numero
    LOOP
      IF v_vencto_ant IS NOT NULL AND v_parc.data_vencimento < v_vencto_ant THEN
        v_mono_ok := false;
      END IF;
      v_vencto_ant := v_parc.data_vencimento;
    END LOOP;
    IF NOT v_mono_ok THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','VENCIMENTO_NAO_MONOTONICO','categoria','PARCELA',
        'mensagem','Datas de vencimento das parcelas não são monotônicas'
      );
    END IF;
  END LOOP;

  -- aviso soft inadimplência (placeholder: FIN-E5 alimenta com títulos vencidos)
  IF v_politica IS NOT NULL AND v_politica.status = 'EM_ANALISE' THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo','CLIENTE_EM_ANALISE','mensagem','Cliente em análise financeira'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_erros) = 0,
    'erros', v_erros,
    'avisos', v_avisos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validar_pagamento_venda(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_pagamento_venda(uuid) TO authenticated, service_role;
