
-- 1) hash_payload em vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS hash_payload text;

-- 2) índice único parcial: 1 venda ativa por orçamento
CREATE UNIQUE INDEX IF NOT EXISTS ux_vendas_orcamento_ativo
  ON public.vendas(orcamento_id)
  WHERE orcamento_id IS NOT NULL AND deleted_at IS NULL;

-- 3) trigger: bloqueia edição de orçamento convertido
CREATE OR REPLACE FUNCTION public.bloquear_edicao_orcamento_convertido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'convertido' THEN
    IF NEW.numero          IS DISTINCT FROM OLD.numero
    OR NEW.cliente_id      IS DISTINCT FROM OLD.cliente_id
    OR NEW.data_emissao    IS DISTINCT FROM OLD.data_emissao
    OR NEW.data_validade   IS DISTINCT FROM OLD.data_validade
    OR NEW.valor_total     IS DISTINCT FROM OLD.valor_total
    OR NEW.observacoes     IS DISTINCT FROM OLD.observacoes
    OR NEW.tipo            IS DISTINCT FROM OLD.tipo
    OR NEW.empresa_representada_id IS DISTINCT FROM OLD.empresa_representada_id
    THEN
      RAISE EXCEPTION 'ORCAMENTO_CONVERTIDO_IMUTAVEL: orçamento já convertido em venda não pode ser editado'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_edicao_orc_convertido ON public.orcamentos_venda;
CREATE TRIGGER trg_bloquear_edicao_orc_convertido
  BEFORE UPDATE ON public.orcamentos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_edicao_orcamento_convertido();

-- 4) RPC de conversão
CREATE OR REPLACE FUNCTION public.converter_orcamento_em_venda(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orc_id            uuid := (p_payload->>'orcamento_id')::uuid;
  v_orc               public.orcamentos_venda%ROWTYPE;
  v_pag               jsonb := COALESCE(p_payload->'pagamento', '{}'::jsonb);
  v_hash              text;
  v_venda_id          uuid;
  v_venda_existente   record;
  v_valor_bruto       numeric(15,2);
  v_valor_desconto    numeric(15,2);
  v_valor_juros       numeric(15,2);
  v_valor_liquido     numeric(15,2);
  v_qtd_parcelas      integer;
  v_dias_primeira     integer;
  v_intervalo_dias    integer;
  v_perc_entrada      numeric(6,3);
  v_vp_id             uuid;
  v_i                 integer;
  v_valor_parcela     numeric(15,2);
  v_valor_acumulado   numeric(15,2) := 0;
  v_venc              date;
  v_is_entrada        boolean;
  v_validacao         jsonb;
  v_numero_venda      text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF v_orc_id IS NULL THEN
    RAISE EXCEPTION 'ORCAMENTO_ID_REQUERIDO' USING ERRCODE = 'P0001';
  END IF;

  -- lock do orçamento
  SELECT * INTO v_orc FROM public.orcamentos_venda
   WHERE id = v_orc_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORCAMENTO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;

  -- tenant
  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT public.user_has_access_to_empresa(v_orc.empresa_representada_id) THEN
    RAISE EXCEPTION 'PERM_DENIED' USING ERRCODE = '42501';
  END IF;

  -- hash canônico
  v_hash := encode(digest(p_payload::text, 'sha256'), 'hex');

  -- idempotência: já convertido?
  IF v_orc.status = 'convertido' THEN
    SELECT id, hash_payload INTO v_venda_existente
      FROM public.vendas
     WHERE orcamento_id = v_orc.id AND deleted_at IS NULL
     LIMIT 1;
    IF FOUND THEN
      IF v_venda_existente.hash_payload IS NOT DISTINCT FROM v_hash THEN
        RETURN jsonb_build_object('ok', true, 'venda_id', v_venda_existente.id, 'replay', true);
      ELSE
        RAISE EXCEPTION 'CONVERSAO_CONFLITO: payload divergente para orçamento já convertido'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  IF v_orc.status <> 'aprovado' THEN
    RAISE EXCEPTION 'ORCAMENTO_NAO_APROVAVEL: status atual = %', v_orc.status USING ERRCODE = 'P0001';
  END IF;

  -- número da venda (empresa + timestamp)
  v_numero_venda := 'V-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(v_orc.id::text,1,4);

  -- INSERT venda
  INSERT INTO public.vendas (
    empresa_representada_id, cliente_id, numero_venda, data_venda, status,
    origem, canal_venda, subtotal, desconto, acrescimo, valor_frete, valor_total,
    observacoes, tipo, orcamento_id, hash_payload
  ) VALUES (
    v_orc.empresa_representada_id, v_orc.cliente_id, v_numero_venda, CURRENT_DATE, 'RASCUNHO',
    'ORCAMENTO', 'ERP', v_orc.valor_total, 0, 0, 0, v_orc.valor_total,
    v_orc.observacoes, CASE WHEN v_orc.tipo IN ('P','S') THEN v_orc.tipo ELSE 'P' END,
    v_orc.id, v_hash
  ) RETURNING id INTO v_venda_id;

  -- Copia itens (mapeando tipo_item; H → P para itens tipados)
  INSERT INTO public.itens_venda (
    empresa_representada_id, venda_id, produto_id, servico_id, descricao,
    quantidade, preco_unitario, desconto_item, acrescimo_item, valor_total_item,
    ordem, observacoes, tipo_item
  )
  SELECT v_orc.empresa_representada_id, v_venda_id, i.produto_id, i.servico_id, i.descricao,
         i.quantidade, i.preco_unitario, i.desconto, 0, i.valor_total,
         i.ordem, i.observacoes, i.tipo_item
    FROM public.orcamentos_venda_itens i
   WHERE i.orcamento_id = v_orc.id;

  -- Pagamento (opcional; se ausente, pula e retorna venda sem pagamento)
  IF (v_pag ? 'modalidade_id') THEN
    v_valor_bruto    := COALESCE((v_pag->>'valor_bruto')::numeric, v_orc.valor_total);
    v_valor_desconto := COALESCE((v_pag->>'valor_desconto')::numeric, 0);
    v_valor_juros    := COALESCE((v_pag->>'valor_juros')::numeric, 0);
    v_valor_liquido  := v_valor_bruto - v_valor_desconto + v_valor_juros;
    v_qtd_parcelas   := GREATEST(COALESCE((v_pag->>'qtd_parcelas')::int, 1), 1);
    v_perc_entrada   := COALESCE((v_pag->>'percentual_entrada')::numeric, 0);
    v_dias_primeira  := COALESCE((v_pag#>>'{parcelamento,dias_primeira}')::int, 30);
    v_intervalo_dias := COALESCE((v_pag#>>'{parcelamento,intervalo_dias}')::int, 30);

    INSERT INTO public.venda_pagamento (
      empresa_representada_id, venda_id, modalidade_id, plano_pagamento_id, natureza_id,
      plano_snapshot, valor_bruto, valor_desconto, valor_juros, valor_liquido,
      qtd_parcelas, percentual_entrada, status, origem_canal,
      idempotency_key, hash_payload, operador_id, created_by
    ) VALUES (
      v_orc.empresa_representada_id, v_venda_id,
      (v_pag->>'modalidade_id')::uuid,
      NULLIF(v_pag->>'plano_pagamento_id','')::uuid,
      NULLIF(v_pag->>'natureza_id','')::uuid,
      COALESCE(v_pag->'plano_snapshot','{}'::jsonb),
      v_valor_bruto, v_valor_desconto, v_valor_juros, v_valor_liquido,
      v_qtd_parcelas, v_perc_entrada, 'PENDENTE',
      COALESCE(v_pag->>'origem_canal','ERP'),
      'ORC:' || v_orc.id::text, v_hash,
      NULLIF(p_payload->>'operador_id','')::uuid, auth.uid()
    ) RETURNING id INTO v_vp_id;

    -- Distribuição uniforme com ajuste no último
    v_valor_parcela := round(v_valor_liquido / v_qtd_parcelas, 2);
    FOR v_i IN 1..v_qtd_parcelas LOOP
      v_venc := CURRENT_DATE + v_dias_primeira + (v_i-1) * v_intervalo_dias;
      v_is_entrada := (v_i = 1 AND v_perc_entrada > 0);
      IF v_i < v_qtd_parcelas THEN
        v_valor_acumulado := v_valor_acumulado + v_valor_parcela;
        INSERT INTO public.venda_pagamento_parcelas (
          empresa_representada_id, venda_pagamento_id, numero, valor, valor_juros,
          data_vencimento, is_entrada
        ) VALUES (
          v_orc.empresa_representada_id, v_vp_id, v_i, v_valor_parcela, 0, v_venc, v_is_entrada
        );
      ELSE
        INSERT INTO public.venda_pagamento_parcelas (
          empresa_representada_id, venda_pagamento_id, numero, valor, valor_juros,
          data_vencimento, is_entrada
        ) VALUES (
          v_orc.empresa_representada_id, v_vp_id, v_i,
          v_valor_liquido - v_valor_acumulado, 0, v_venc, v_is_entrada
        );
      END IF;
    END LOOP;

    -- Validação de negócio (rollback via RAISE se falhar)
    v_validacao := public.validar_pagamento_venda(v_venda_id);
    IF NOT COALESCE((v_validacao->>'ok')::boolean, false) THEN
      RAISE EXCEPTION 'PAGAMENTO_INVALIDO: %', v_validacao::text USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Finaliza
  UPDATE public.vendas SET status = 'CONFIRMADO', updated_at = now() WHERE id = v_venda_id;
  UPDATE public.orcamentos_venda
     SET status = 'convertido', versao = versao + 1, updated_at = now()
   WHERE id = v_orc.id;

  RETURN jsonb_build_object(
    'ok', true,
    'venda_id', v_venda_id,
    'replay', false,
    'avisos', COALESCE(v_validacao->'avisos','[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.converter_orcamento_em_venda(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.converter_orcamento_em_venda(jsonb) TO authenticated;
