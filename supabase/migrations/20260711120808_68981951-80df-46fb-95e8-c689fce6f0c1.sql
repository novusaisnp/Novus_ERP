
-- FIN-E5: rastreabilidade e idempotência em contas_receber
ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS venda_id uuid NULL REFERENCES public.vendas(id),
  ADD COLUMN IF NOT EXISTS venda_pagamento_id uuid NULL REFERENCES public.venda_pagamento(id),
  ADD COLUMN IF NOT EXISTS venda_pagamento_parcela_id uuid NULL REFERENCES public.venda_pagamento_parcelas(id),
  ADD COLUMN IF NOT EXISTS origem_canal text NULL,
  ADD COLUMN IF NOT EXISTS origem_sistema text NULL,
  ADD COLUMN IF NOT EXISTS externo_id text NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text NULL,
  ADD COLUMN IF NOT EXISTS hash_payload text NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL;

CREATE INDEX IF NOT EXISTS idx_cr_venda_id ON public.contas_receber(venda_id);
CREATE INDEX IF NOT EXISTS idx_cr_venda_pagamento_id ON public.contas_receber(venda_pagamento_id);
CREATE INDEX IF NOT EXISTS idx_cr_idempotency_key ON public.contas_receber(idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cr_parcela_ativa
  ON public.contas_receber(empresa_representada_id, venda_pagamento_parcela_id)
  WHERE venda_pagamento_parcela_id IS NOT NULL AND deleted_at IS NULL;

-- Função de geração idempotente
CREATE OR REPLACE FUNCTION public.gerar_contas_receber_da_venda(
  p_venda_id uuid,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda        record;
  v_vp           record;
  v_parc         record;
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
      v_soma_parc := v_soma_parc + coalesce(v_parc.valor,0) + coalesce(v_parc.valor_juros,0);

      v_hash := encode(digest(
        jsonb_build_object(
          'venda_id', v_venda.id,
          'parcela_id', v_parc.id,
          'valor', v_parc.valor,
          'valor_juros', v_parc.valor_juros,
          'vencimento', v_parc.data_vencimento,
          'numero', v_parc.numero,
          'qtd', v_vp.qtd_parcelas
        )::text, 'sha256'), 'hex');

      -- reuso?
      SELECT id, hash_payload, valor_original INTO v_existente
        FROM public.contas_receber
       WHERE empresa_representada_id = v_venda.empresa_representada_id
         AND venda_pagamento_parcela_id = v_parc.id
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
          'replay', true
        );
        CONTINUE;
      END IF;

      v_desc := format('Venda %s - Parcela %s/%s',
                       coalesce(v_venda.numero_venda,'S/N'), v_parc.numero, v_vp.qtd_parcelas);

      INSERT INTO public.contas_receber (
        empresa_representada_id, cliente_id, descricao, numero_documento,
        valor_original, data_emissao, data_vencimento, status,
        numero_parcela, total_parcelas, plano_pagamento_id, natureza_id,
        venda_id, venda_pagamento_id, venda_pagamento_parcela_id,
        origem_canal, origem_sistema, externo_id, idempotency_key,
        hash_payload, created_by
      ) VALUES (
        v_venda.empresa_representada_id, v_venda.cliente_id, v_desc, v_venda.numero_venda,
        coalesce(v_parc.valor,0) + coalesce(v_parc.valor_juros,0),
        CURRENT_DATE, v_parc.data_vencimento, 'PENDENTE',
        v_parc.numero, v_vp.qtd_parcelas, v_vp.plano_pagamento_id, v_vp.natureza_id,
        v_venda.id, v_vp.id, v_parc.id,
        v_vp.origem_canal, v_vp.origem_sistema, v_parc.externo_id,
        coalesce(p_idempotency_key, 'VP:'||v_vp.id::text||':P:'||v_parc.numero::text),
        v_hash, auth.uid()
      ) RETURNING id INTO v_new_id;

      v_gerados := v_gerados + 1;
      v_soma_tit := v_soma_tit + coalesce(v_parc.valor,0) + coalesce(v_parc.valor_juros,0);
      v_titulos := v_titulos || jsonb_build_object(
        'parcela_id', v_parc.id,
        'conta_receber_id', v_new_id,
        'replay', false
      );
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
$$;

REVOKE ALL ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) TO authenticated;
