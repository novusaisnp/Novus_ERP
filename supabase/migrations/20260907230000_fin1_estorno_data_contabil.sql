-- FIN-1: data contábil manual no estorno de liquidação (item pendente do
-- checklist, ver PLANO_MESTRE.md). Antes, o lançamento reverso sempre usava
-- CURRENT_DATE — impede reverter numa data compatível com o período contábil
-- da liquidação original (ex.: estorno feito em outro mês, mas que deveria
-- afetar o mesmo período da baixa). Segue a mesma convenção já usada em
-- lancar_liquidacao_titulo(): data_lancamento e data_competencia recebem o
-- mesmo valor escolhido pelo usuário (não "lançado hoje, competência
-- retroativa" — o modelo aqui é sempre uma única data de negócio).

ALTER TABLE public.liquidacoes_titulos
  ADD COLUMN IF NOT EXISTS estorno_data_contabil date;

CREATE OR REPLACE FUNCTION public.lancar_estorno_liquidacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_id uuid;
  v_estorno_id uuid;
  v_item record;
  v_data date;
BEGIN
  IF NEW.estornado IS DISTINCT FROM true OR OLD.estornado IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_original_id FROM public.lancamentos_contabeis
  WHERE origem_tabela = 'liquidacoes_titulos' AND origem_id = NEW.id;

  IF v_original_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_data := COALESCE(NEW.estorno_data_contabil, CURRENT_DATE);

  INSERT INTO public.lancamentos_contabeis (
    empresa_representada_id, data_lancamento, data_competencia, historico,
    origem_tipo, origem_tabela, origem_id, estorno_de_id, idempotency_key
  ) VALUES (
    NEW.empresa_representada_id, v_data, v_data,
    CONCAT('Estorno — ', COALESCE(NEW.motivo_estorno, 'liquidação estornada')),
    'ESTORNO', 'liquidacoes_titulos', NEW.id, v_original_id, CONCAT(NEW.id::text, '-estorno')
  ) RETURNING id INTO v_estorno_id;

  FOR v_item IN SELECT conta_contabil_id, tipo_partida, valor, centro_custo_id
                FROM public.lancamentos_contabeis_itens WHERE lancamento_id = v_original_id LOOP
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (
        v_estorno_id, v_item.conta_contabil_id,
        CASE WHEN v_item.tipo_partida = 'DEBITO' THEN 'CREDITO' ELSE 'DEBITO' END,
        v_item.valor, v_item.centro_custo_id
      );
  END LOOP;

  RETURN NEW;
END;
$$;

-- financeiro_estornar_liquidacao: ganha p_data_contabil opcional (default
-- NULL -> CURRENT_DATE, comportamento antigo preservado). Validação: não
-- pode ser no futuro nem anterior à data da liquidação que está sendo
-- revertida (um estorno não pode "acontecer" antes do que reverte).
DROP FUNCTION IF EXISTS public.financeiro_estornar_liquidacao(uuid, text, uuid, uuid);
CREATE OR REPLACE FUNCTION public.financeiro_estornar_liquidacao(
  p_liquidacao_id uuid,
  p_motivo text,
  p_idempotency_key uuid,
  p_ticket_autorizacao uuid DEFAULT NULL::uuid,
  p_data_contabil date DEFAULT NULL::date
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_titulo_id uuid;
  v_tipo_titulo text;
  v_valor_estornado numeric;
  v_valor_original numeric;
  v_valor_restante numeric;
  v_data_restante date;
  v_data_liquidacao date;
  v_data_contabil date;
  v_status_novo text;
  v_ja_estornado boolean;
  v_chave_existente uuid;
  v_movimentacoes_afetadas integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM financeiro_exigir_permissao('financeiro.estorno');
  PERFORM financeiro_exigir_autorizacao_liquidacao(p_ticket_autorizacao, p_liquidacao_id);
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotencia obrigatoria';
  END IF;
  IF length(trim(COALESCE(p_motivo, ''))) < 5 THEN
    RAISE EXCEPTION 'Motivo do estorno deve ter ao menos 5 caracteres';
  END IF;
  IF p_data_contabil IS NOT NULL AND p_data_contabil > CURRENT_DATE THEN
    RAISE EXCEPTION 'Data contabil do estorno nao pode ser no futuro';
  END IF;

  SELECT empresa_representada_id,
         COALESCE(titulo_id, conta_pagar_id, conta_receber_id),
         COALESCE(tipo_titulo,
           CASE WHEN conta_pagar_id IS NOT NULL THEN 'CONTAS_PAGAR'
                WHEN conta_receber_id IS NOT NULL THEN 'CONTAS_RECEBER' END),
         valor_pago, estornado, estorno_idempotency_key,
         COALESCE(data_pagamento, data_liquidacao)
    INTO v_empresa_id, v_titulo_id, v_tipo_titulo, v_valor_estornado,
         v_ja_estornado, v_chave_existente, v_data_liquidacao
    FROM public.liquidacoes_titulos
   WHERE id = p_liquidacao_id
   FOR UPDATE;

  IF v_empresa_id IS NULL OR v_titulo_id IS NULL OR v_tipo_titulo IS NULL THEN
    RAISE EXCEPTION 'Liquidacao nao encontrada ou sem titulo vinculado';
  END IF;
  IF NOT public.user_has_access_to_empresa(v_empresa_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF v_ja_estornado THEN
    IF v_chave_existente = p_idempotency_key THEN
      RETURN jsonb_build_object(
        'liquidacao_id', p_liquidacao_id,
        'idempotente', true
      );
    END IF;
    RAISE EXCEPTION 'Liquidacao ja estornada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.movimentacoes_bancarias
     WHERE liquidacao_titulo_id = p_liquidacao_id
       AND conciliado = true
  ) THEN
    RAISE EXCEPTION 'Desfaca a conciliacao bancaria antes do estorno';
  END IF;

  v_data_contabil := COALESCE(p_data_contabil, CURRENT_DATE);
  IF v_data_liquidacao IS NOT NULL AND v_data_contabil < v_data_liquidacao THEN
    RAISE EXCEPTION 'Data contabil do estorno nao pode ser anterior a data da liquidacao (%).', v_data_liquidacao;
  END IF;

  IF v_tipo_titulo = 'CONTAS_RECEBER' THEN
    SELECT valor_original INTO v_valor_original
      FROM public.contas_receber
     WHERE id = v_titulo_id AND empresa_representada_id = v_empresa_id
       AND deleted_at IS NULL
     FOR UPDATE;
  ELSIF v_tipo_titulo = 'CONTAS_PAGAR' THEN
    SELECT valor_original INTO v_valor_original
      FROM public.contas_pagar
     WHERE id = v_titulo_id AND empresa_representada_id = v_empresa_id
       AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Tipo de titulo invalido na liquidacao';
  END IF;

  IF v_valor_original IS NULL THEN
    RAISE EXCEPTION 'Titulo da liquidacao nao encontrado';
  END IF;

  UPDATE public.liquidacoes_titulos
     SET estornado = true,
         data_estorno = now(),
         motivo_estorno = trim(p_motivo),
         usuario_estorno_id = auth.uid(),
         estorno_idempotency_key = p_idempotency_key,
         estorno_data_contabil = v_data_contabil
   WHERE id = p_liquidacao_id;

  UPDATE public.movimentacoes_bancarias
     SET estornado = true,
         status = 'ESTORNADO',
         ativo = false,
         data_estorno = now(),
         usuario_estorno_id = auth.uid(),
         motivo_estorno = trim(p_motivo)
   WHERE liquidacao_titulo_id = p_liquidacao_id
     AND estornado = false;
  GET DIAGNOSTICS v_movimentacoes_afetadas = ROW_COUNT;

  SELECT COALESCE(sum(valor_pago), 0), max(data_pagamento)
    INTO v_valor_restante, v_data_restante
    FROM public.liquidacoes_titulos
   WHERE empresa_representada_id = v_empresa_id
     AND COALESCE(estornado, false) = false
     AND COALESCE(cancelada, false) = false
     AND (
       titulo_id = v_titulo_id
       OR (v_tipo_titulo = 'CONTAS_PAGAR' AND conta_pagar_id = v_titulo_id)
       OR (v_tipo_titulo = 'CONTAS_RECEBER' AND conta_receber_id = v_titulo_id)
     );

  IF v_valor_restante > v_valor_original THEN
    RAISE EXCEPTION 'Total liquidado remanescente excede o valor do titulo';
  END IF;
  v_status_novo := CASE
    WHEN v_valor_restante = 0 THEN 'PENDENTE'
    WHEN v_valor_restante < v_valor_original THEN 'PARCIAL'
    WHEN v_tipo_titulo = 'CONTAS_RECEBER' THEN 'RECEBIDO'
    ELSE 'PAGO'
  END;

  IF v_tipo_titulo = 'CONTAS_RECEBER' THEN
    UPDATE public.contas_receber
       SET valor_recebido = v_valor_restante,
           data_recebimento = CASE WHEN v_status_novo = 'RECEBIDO' THEN v_data_restante END,
           status = v_status_novo
     WHERE id = v_titulo_id;
  ELSE
    UPDATE public.contas_pagar
       SET valor_pago = v_valor_restante,
           data_pagamento = CASE WHEN v_status_novo = 'PAGO' THEN v_data_restante END,
           status = v_status_novo
     WHERE id = v_titulo_id;
  END IF;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, valor_movimentado, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN v_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    v_titulo_id, 'ESTORNO', v_titulo_id, v_tipo_titulo, 'ESTORNO', v_valor_estornado,
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('liquidacao_id', p_liquidacao_id, 'valor_liquidado', v_valor_restante + v_valor_estornado),
    jsonb_build_object('status', v_status_novo, 'valor_liquidado', v_valor_restante,
                       'movimentacoes_estornadas', v_movimentacoes_afetadas, 'data_contabil', v_data_contabil),
    trim(p_motivo)
  );

  RETURN jsonb_build_object(
    'liquidacao_id', p_liquidacao_id,
    'idempotente', false,
    'status', v_status_novo,
    'valor_estornado', v_valor_estornado,
    'valor_liquidado_restante', v_valor_restante,
    'movimentacoes_estornadas', v_movimentacoes_afetadas,
    'data_contabil', v_data_contabil
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.financeiro_estornar_liquidacao(uuid, text, uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.financeiro_estornar_liquidacao(uuid, text, uuid, uuid, date) TO authenticated, service_role;
