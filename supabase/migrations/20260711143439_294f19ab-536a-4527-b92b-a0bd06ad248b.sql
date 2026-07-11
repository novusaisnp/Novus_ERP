
-- =========================================================================
-- LOTE 1 (residual) — Hardening de RPCs: revogar execução para anon
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.converter_orcamento_em_venda(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolver_classificacao_receita(uuid) FROM anon;

-- =========================================================================
-- LOTE 2 — FIN-E5.1: contas a receber classificadas
-- =========================================================================

-- 1) Ajuste de schema em contas_receber
ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS hash_classificacao text;

-- Substituir unique constraint: 1 título por (parcela, classificacao)
DROP INDEX IF EXISTS public.ux_cr_parcela_ativa;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cr_parcela_class_ativa
  ON public.contas_receber (empresa_representada_id, venda_pagamento_parcela_id, hash_classificacao)
  WHERE venda_pagamento_parcela_id IS NOT NULL AND deleted_at IS NULL;

-- Índice auxiliar por hash_classificacao (consultas por rateio)
CREATE INDEX IF NOT EXISTS idx_cr_hash_class
  ON public.contas_receber (hash_classificacao)
  WHERE hash_classificacao IS NOT NULL;

-- 2) Reescrita da RPC gerar_contas_receber_da_venda
CREATE OR REPLACE FUNCTION public.gerar_contas_receber_da_venda(
  p_venda_id uuid,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  IF NOT public.has_role(auth.uid(),'admin')
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

-- Re-revogar anon após CREATE OR REPLACE (Postgres preserva ACL, mas garantimos)
REVOKE EXECUTE ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) TO authenticated, service_role;
