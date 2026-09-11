-- Bloco A da varredura de RPCs SECURITY DEFINER (ver STATUS.md, checkpoint
-- 2026-09-10 "RPCs financeiras corrigidas"). Mesmo padrão das 4 funções
-- financeiras já corrigidas em 20260910150000: has_role(auth.uid(),'admin')
-- é GLOBAL (admin de QUALQUER empresa), usado como bypass da checagem
-- user_has_access_to_empresa(...). Fix: trocar 'admin' por 'novus_owner',
-- mesmo bypass já formalizado em has_role_for_empresa.
--
-- 7 funções deste bloco (vendas/estoque), todas confirmadas vulneráveis por
-- leitura completa do corpo antes de aplicar:
--   autorizar_excecao_venda, baixar_estoque_venda, conciliar_inventario,
--   converter_orcamento_em_venda, estornar_estoque_venda,
--   gerar_contas_receber_da_venda, verificar_autorizacao_venda

CREATE OR REPLACE FUNCTION public.autorizar_excecao_venda(p_cliente_id uuid, p_empresa_id uuid, p_bloqueio_codigo text, p_valor_pretendido numeric, p_justificativa text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_permissao text := 'vendas.autorizarInadimplencia';
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.baixar_estoque_venda(p_venda_id uuid, p_localizacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_venda record;
  v_item record;
  v_baixados int := 0;
  v_ja_baixados int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'VENDA_NAO_ENCONTRADA' USING ERRCODE='P0001'; END IF;
  IF NOT public.has_role(auth.uid(),'novus_owner') AND NOT public.user_has_access_to_empresa(v_venda.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;

  FOR v_item IN
    SELECT iv.produto_id, SUM(iv.quantidade) AS qtd
    FROM public.itens_venda iv
    JOIN public.produtos p ON p.id = iv.produto_id
    WHERE iv.venda_id = p_venda_id
      AND iv.produto_id IS NOT NULL
      AND p.controla_estoque = true
    GROUP BY iv.produto_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.estoque_movimentacoes
      WHERE venda_id = p_venda_id AND produto_id = v_item.produto_id
        AND tipo = 'SAIDA' AND deleted_at IS NULL
    ) THEN
      v_ja_baixados := v_ja_baixados + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade,
      localizacao_origem_id, venda_id, documento_ref, created_by
    ) VALUES (
      v_venda.empresa_representada_id, v_item.produto_id, 'SAIDA', v_item.qtd,
      p_localizacao_id, p_venda_id, v_venda.numero_venda, auth.uid()
    );
    v_baixados := v_baixados + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'baixados', v_baixados, 'ja_baixados', v_ja_baixados);
END;
$function$;

CREATE OR REPLACE FUNCTION public.conciliar_inventario(p_inventario_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv record;
  v_it record;
  v_gerados int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_inv FROM public.estoque_inventarios WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTARIO_NAO_ENCONTRADO' USING ERRCODE='P0001'; END IF;
  IF NOT public.has_role(auth.uid(),'novus_owner') AND NOT public.user_has_access_to_empresa(v_inv.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;
  IF v_inv.status = 'CONCILIADO' THEN
    RETURN jsonb_build_object('ok', true, 'gerados', 0, 'replay', true);
  END IF;
  IF v_inv.localizacao_id IS NULL THEN
    RAISE EXCEPTION 'INVENTARIO_SEM_LOCALIZACAO' USING ERRCODE='P0001';
  END IF;

  FOR v_it IN
    SELECT * FROM public.estoque_inventario_itens WHERE inventario_id = p_inventario_id AND diferenca <> 0
  LOOP
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade,
      custo_unitario, localizacao_origem_id, localizacao_destino_id,
      inventario_id, documento_ref, observacoes, created_by
    ) VALUES (
      v_inv.empresa_representada_id, v_it.produto_id,
      CASE WHEN v_it.diferenca > 0 THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END,
      abs(v_it.diferenca),
      v_it.custo_unitario,
      CASE WHEN v_it.diferenca < 0 THEN v_inv.localizacao_id END,
      CASE WHEN v_it.diferenca > 0 THEN v_inv.localizacao_id END,
      p_inventario_id, v_inv.codigo,
      'Ajuste de inventário',
      auth.uid()
    );
    v_gerados := v_gerados + 1;
  END LOOP;

  UPDATE public.estoque_inventarios
     SET status='CONCILIADO', data_fim = now(), updated_at = now()
   WHERE id = p_inventario_id;

  RETURN jsonb_build_object('ok', true, 'gerados', v_gerados, 'replay', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.converter_orcamento_em_venda(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  IF NOT public.has_role(auth.uid(),'novus_owner')
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
$function$;

CREATE OR REPLACE FUNCTION public.estornar_estoque_venda(p_venda_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mov record;
  v_estornados int := 0;
  v_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT empresa_representada_id INTO v_empresa FROM public.vendas WHERE id = p_venda_id;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'VENDA_NAO_ENCONTRADA' USING ERRCODE='P0001'; END IF;
  IF NOT public.has_role(auth.uid(),'novus_owner') AND NOT public.user_has_access_to_empresa(v_empresa) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;

  FOR v_mov IN
    SELECT * FROM public.estoque_movimentacoes
    WHERE venda_id = p_venda_id AND tipo = 'SAIDA' AND deleted_at IS NULL
  LOOP
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade,
      localizacao_destino_id, venda_id, documento_ref, observacoes, created_by
    ) VALUES (
      v_mov.empresa_representada_id, v_mov.produto_id, 'ENTRADA', v_mov.quantidade,
      v_mov.localizacao_origem_id, p_venda_id,
      'ESTORNO:' || COALESCE(v_mov.documento_ref,''),
      'Estorno da saída ' || v_mov.id::text, auth.uid()
    );
    UPDATE public.estoque_movimentacoes SET deleted_at = now() WHERE id = v_mov.id;
    v_estornados := v_estornados + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'estornados', v_estornados);
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_contas_receber_da_venda(p_venda_id uuid, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_venda        record;
  v_vp           record;
  v_parc         record;
  v_class        record;
  v_titulos      jsonb := '[]'::jsonb;
  v_erros        jsonb := '[]'::jsonb;
  v_avisos       jsonb := '[]'::jsonb;
  v_gerados      integer := 0;
  v_reaprov      integer := 0;
  v_hash         text;
  v_existente    record;
  v_new_id       uuid;
  v_soma_parc    numeric(15,2) := 0;
  v_soma_tit     numeric(15,2) := 0;
  v_desc         text;
  v_valor_parc   numeric(15,2);
  v_valor_tit    numeric(15,2);
  v_soma_rateio  numeric(15,2);
  v_qtd_class    integer;
  v_hash_class   text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_venda FROM public.vendas
   WHERE id = p_venda_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VENDA_NAO_ENCONTRADA' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.has_role(auth.uid(),'novus_owner')
     AND NOT public.user_has_access_to_empresa(v_venda.empresa_representada_id) THEN
    RAISE EXCEPTION 'PERM_DENIED' USING ERRCODE = '42501';
  END IF;

  IF upper(coalesce(v_venda.status::text,'')) NOT IN ('CONFIRMADO','FATURADO','ENTREGUE','EM_PRODUCAO') THEN
    RAISE EXCEPTION 'VENDA_NAO_ELEGIVEL: status atual = %', v_venda.status USING ERRCODE = 'P0001';
  END IF;

  IF v_venda.cliente_id IS NULL THEN
    RAISE EXCEPTION 'CLIENTE_OBRIGATORIO' USING ERRCODE = 'P0001';
  END IF;

  FOR v_vp IN
    SELECT * FROM public.venda_pagamento
     WHERE venda_id = v_venda.id AND deleted_at IS NULL
       AND status IN ('PENDENTE','AUTORIZADO','CAPTURADO')
  LOOP
    FOR v_parc IN
      SELECT * FROM public.venda_pagamento_parcelas
       WHERE venda_pagamento_id = v_vp.id
         AND status IN ('ABERTA','LIQUIDADA_PARCIAL')
       ORDER BY numero
    LOOP
      v_valor_parc := coalesce(v_parc.valor,0) + coalesce(v_parc.valor_juros,0);
      v_soma_parc := v_soma_parc + v_valor_parc;

      -- Quantas classificações existem para esta parcela?
      SELECT COUNT(*), COALESCE(SUM(valor_rateado),0)
        INTO v_qtd_class, v_soma_rateio
        FROM public.venda_parcela_classificacao_receita
       WHERE venda_pagamento_parcela_id = v_parc.id;

      IF v_qtd_class = 0 THEN
        -- Fallback: sem classificação → 1 título único (retro-compat)
        v_hash_class := NULL;
        v_valor_tit := v_valor_parc;

        v_hash := encode(digest(
          jsonb_build_object(
            'venda_id', v_venda.id,
            'parcela_id', v_parc.id,
            'valor', v_valor_tit,
            'vencimento', v_parc.data_vencimento,
            'numero', v_parc.numero,
            'qtd', v_vp.qtd_parcelas,
            'class', 'NONE'
          )::text, 'sha256'), 'hex');

        SELECT id, hash_payload, valor_original INTO v_existente
          FROM public.contas_receber
         WHERE empresa_representada_id = v_venda.empresa_representada_id
           AND venda_pagamento_parcela_id = v_parc.id
           AND hash_classificacao IS NULL
           AND deleted_at IS NULL
         LIMIT 1;

        IF FOUND THEN
          IF v_existente.hash_payload IS DISTINCT FROM v_hash THEN
            RAISE EXCEPTION 'CONFLITO_PAYLOAD_DIVERGENTE: parcela % já possui título com payload diferente', v_parc.id
              USING ERRCODE = 'P0001';
          END IF;
          v_reaprov := v_reaprov + 1;
          v_soma_tit := v_soma_tit + v_existente.valor_original;
          v_titulos := v_titulos || jsonb_build_object(
            'parcela_id', v_parc.id,
            'conta_receber_id', v_existente.id,
            'hash_classificacao', NULL,
            'replay', true
          );
        ELSE
          v_desc := format('Venda %s - Parcela %s/%s',
                           coalesce(v_venda.numero_venda,'S/N'), v_parc.numero, v_vp.qtd_parcelas);

          INSERT INTO public.contas_receber (
            empresa_representada_id, cliente_id, descricao, numero_documento,
            valor_original, data_emissao, data_vencimento, status,
            numero_parcela, total_parcelas, plano_pagamento_id, natureza_id,
            plano_conta_id, centro_custo_id,
            venda_id, venda_pagamento_id, venda_pagamento_parcela_id,
            origem_canal, origem_sistema, externo_id, idempotency_key,
            hash_payload, hash_classificacao, created_by
          ) VALUES (
            v_venda.empresa_representada_id, v_venda.cliente_id, v_desc, v_venda.numero_venda,
            v_valor_tit, CURRENT_DATE, v_parc.data_vencimento, 'PENDENTE',
            v_parc.numero, v_vp.qtd_parcelas, v_vp.plano_pagamento_id, v_vp.natureza_id,
            NULL, NULL,
            v_venda.id, v_vp.id, v_parc.id,
            v_vp.origem_canal, v_vp.origem_sistema, v_parc.externo_id,
            coalesce(p_idempotency_key, 'VP:'||v_vp.id::text||':P:'||v_parc.numero::text),
            v_hash, NULL, auth.uid()
          ) RETURNING id INTO v_new_id;

          v_gerados := v_gerados + 1;
          v_soma_tit := v_soma_tit + v_valor_tit;
          v_titulos := v_titulos || jsonb_build_object(
            'parcela_id', v_parc.id,
            'conta_receber_id', v_new_id,
            'hash_classificacao', NULL,
            'replay', false
          );
        END IF;

        v_avisos := v_avisos || jsonb_build_object(
          'codigo','PARCELA_SEM_CLASSIFICACAO',
          'mensagem', format('Parcela %s sem rateio contábil — título gerado sem plano/centro', v_parc.id)
        );

      ELSE
        -- Com classificação: 1 título por rateio
        IF abs(v_soma_rateio - v_valor_parc) > 0.02 THEN
          RAISE EXCEPTION 'DIVERGENCIA_CLASSIFICACAO: soma rateios (%) difere do valor parcela (%) na parcela %',
            v_soma_rateio, v_valor_parc, v_parc.id
            USING ERRCODE = 'P0001';
        END IF;

        FOR v_class IN
          SELECT * FROM public.venda_parcela_classificacao_receita
           WHERE venda_pagamento_parcela_id = v_parc.id
           ORDER BY hash_classificacao
        LOOP
          v_valor_tit := v_class.valor_rateado;

          v_hash := encode(digest(
            jsonb_build_object(
              'venda_id', v_venda.id,
              'parcela_id', v_parc.id,
              'valor', v_valor_tit,
              'vencimento', v_parc.data_vencimento,
              'numero', v_parc.numero,
              'qtd', v_vp.qtd_parcelas,
              'plano_conta_id', v_class.plano_conta_id,
              'centro_custo_id', v_class.centro_custo_id,
              'hash_classificacao', v_class.hash_classificacao
            )::text, 'sha256'), 'hex');

          SELECT id, hash_payload, valor_original INTO v_existente
            FROM public.contas_receber
           WHERE empresa_representada_id = v_venda.empresa_representada_id
             AND venda_pagamento_parcela_id = v_parc.id
             AND hash_classificacao = v_class.hash_classificacao
             AND deleted_at IS NULL
           LIMIT 1;

          IF FOUND THEN
            IF v_existente.hash_payload IS DISTINCT FROM v_hash THEN
              RAISE EXCEPTION 'CONFLITO_PAYLOAD_DIVERGENTE: parcela % / class % já possui título divergente', v_parc.id, v_class.hash_classificacao
                USING ERRCODE = 'P0001';
            END IF;
            v_reaprov := v_reaprov + 1;
            v_soma_tit := v_soma_tit + v_existente.valor_original;
            v_titulos := v_titulos || jsonb_build_object(
              'parcela_id', v_parc.id,
              'conta_receber_id', v_existente.id,
              'hash_classificacao', v_class.hash_classificacao,
              'replay', true
            );
          ELSE
            v_desc := format('Venda %s - Parcela %s/%s (rateio %s)',
                             coalesce(v_venda.numero_venda,'S/N'), v_parc.numero, v_vp.qtd_parcelas,
                             substr(v_class.hash_classificacao,1,8));

            INSERT INTO public.contas_receber (
              empresa_representada_id, cliente_id, descricao, numero_documento,
              valor_original, data_emissao, data_vencimento, status,
              numero_parcela, total_parcelas, plano_pagamento_id, natureza_id,
              plano_conta_id, centro_custo_id,
              venda_id, venda_pagamento_id, venda_pagamento_parcela_id,
              origem_canal, origem_sistema, externo_id, idempotency_key,
              hash_payload, hash_classificacao, created_by
            ) VALUES (
              v_venda.empresa_representada_id, v_venda.cliente_id, v_desc, v_venda.numero_venda,
              v_valor_tit, CURRENT_DATE, v_parc.data_vencimento, 'PENDENTE',
              v_parc.numero, v_vp.qtd_parcelas, v_vp.plano_pagamento_id, v_vp.natureza_id,
              v_class.plano_conta_id, v_class.centro_custo_id,
              v_venda.id, v_vp.id, v_parc.id,
              v_vp.origem_canal, v_vp.origem_sistema, v_parc.externo_id,
              coalesce(p_idempotency_key, 'VP:'||v_vp.id::text||':P:'||v_parc.numero::text||':C:'||substr(v_class.hash_classificacao,1,8)),
              v_hash, v_class.hash_classificacao, auth.uid()
            ) RETURNING id INTO v_new_id;

            v_gerados := v_gerados + 1;
            v_soma_tit := v_soma_tit + v_valor_tit;
            v_titulos := v_titulos || jsonb_build_object(
              'parcela_id', v_parc.id,
              'conta_receber_id', v_new_id,
              'hash_classificacao', v_class.hash_classificacao,
              'plano_conta_id', v_class.plano_conta_id,
              'centro_custo_id', v_class.centro_custo_id,
              'replay', false
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  IF v_gerados = 0 AND v_reaprov = 0 THEN
    v_avisos := v_avisos || jsonb_build_object('codigo','SEM_PARCELAS_ELEGIVEIS',
      'mensagem','Nenhuma parcela elegível encontrada para esta venda');
  END IF;

  IF abs(v_soma_tit - v_soma_parc) > 0.02 THEN
    RAISE EXCEPTION 'DIVERGENCIA_TOTAL: soma títulos (%) difere de soma parcelas (%)', v_soma_tit, v_soma_parc
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'venda_id', v_venda.id,
    'gerados', v_gerados,
    'reaproveitados', v_reaprov,
    'titulos', v_titulos,
    'erros', v_erros,
    'avisos', v_avisos
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_autorizacao_venda(p_cliente_id uuid, p_empresa_id uuid, p_valor_pretendido numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$function$;
