-- Achado na varredura de RPCs SECURITY DEFINER que seguiu os fixes de
-- empresa_responsavel e perfis_acesso (mesmo checkpoint de 2026-09-10, ver
-- STATUS.md). As 4 funções de movimentação de título financeiro
-- (financeiro_liquidar_titulo, financeiro_cancelar_titulo,
-- financeiro_estornar_liquidacao, financeiro_renegociar_titulo) checavam o
-- limite de empresa assim:
--
--   IF NOT public.user_has_access_to_empresa(v_empresa_id)
--      AND NOT public.has_role(auth.uid(), 'admin') THEN
--     RAISE EXCEPTION 'Acesso negado para a empresa';
--
-- has_role(uid,'admin') é GLOBAL — true se o usuário é admin de QUALQUER
-- empresa (ver definição: EXISTS em user_roles sem filtro de
-- empresa_representada_id). Isso faz o segundo termo do OR sempre destravar
-- a checagem para qualquer admin, de qualquer empresa, sobre o título de
-- QUALQUER OUTRA empresa — liquidar, cancelar, estornar e renegociar título
-- (dinheiro de verdade) cross-tenant. Mesma classe de bug do vazamento de
-- empresa_responsavel (2026-09-10), aqui na camada de RPC em vez de RLS.
--
-- Fix: troca 'admin' por 'novus_owner' — mesmo padrão já formalizado em
-- has_role_for_empresa (só novus_owner tem bypass cross-empresa; qualquer
-- outro papel precisa estar vinculado à empresa via user_has_access_to_empresa).
-- financeiro_salvar_titulo (criar/editar) já seguia esse desenho corretamente
-- e não precisou de ajuste.
--
-- Varredura mais ampla achou ~30 outras funções com o mesmo padrão textual
-- (vendas/compras/estoque/relatórios) — registradas como backlog em
-- STATUS.md, não corrigidas nesta migration (precisam leitura individual
-- antes de mexer, dado o volume e a sensibilidade de várias delas).

CREATE OR REPLACE FUNCTION public.financeiro_cancelar_titulo(p_titulo_id uuid, p_tipo_titulo text, p_motivo text, p_idempotency_key uuid, p_ticket_autorizacao uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_status text;
  v_valor_liquidado numeric;
  v_chave_existente uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM financeiro_exigir_permissao('financeiro.cancelamento');
  PERFORM financeiro_exigir_autorizacao_titulo(
    p_ticket_autorizacao, 'CANCELAMENTO', p_tipo_titulo, p_titulo_id);
  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotencia obrigatoria';
  END IF;
  IF length(trim(COALESCE(p_motivo, ''))) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento deve ter ao menos 5 caracteres';
  END IF;

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    SELECT empresa_representada_id, status, COALESCE(valor_pago, 0), cancelamento_idempotency_key
      INTO v_empresa_id, v_status, v_valor_liquidado, v_chave_existente
      FROM public.contas_pagar
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    SELECT empresa_representada_id, status, COALESCE(valor_recebido, 0), cancelamento_idempotency_key
      INTO v_empresa_id, v_status, v_valor_liquidado, v_chave_existente
      FROM public.contas_receber
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Titulo nao encontrado';
  END IF;
  IF NOT public.user_has_access_to_empresa(v_empresa_id)
     AND NOT public.has_role(auth.uid(), 'novus_owner') THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF v_status = 'CANCELADO' THEN
    IF v_chave_existente = p_idempotency_key THEN
      RETURN jsonb_build_object('titulo_id', p_titulo_id, 'idempotente', true);
    END IF;
    RAISE EXCEPTION 'Titulo ja cancelado';
  END IF;
  IF v_valor_liquidado > 0 OR EXISTS (
    SELECT 1
      FROM public.liquidacoes_titulos
     WHERE empresa_representada_id = v_empresa_id
       AND COALESCE(estornado, false) = false
       AND COALESCE(cancelada, false) = false
       AND (
         titulo_id = p_titulo_id
         OR (p_tipo_titulo = 'CONTAS_PAGAR' AND conta_pagar_id = p_titulo_id)
         OR (p_tipo_titulo = 'CONTAS_RECEBER' AND conta_receber_id = p_titulo_id)
       )
  ) THEN
    RAISE EXCEPTION 'Estorne todas as liquidacoes antes de cancelar o titulo';
  END IF;

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    UPDATE public.contas_pagar
       SET status = 'CANCELADO',
           motivo_cancelamento = trim(p_motivo),
           data_cancelamento = now(),
           usuario_cancelamento_id = auth.uid(),
           cancelamento_idempotency_key = p_idempotency_key
     WHERE id = p_titulo_id;
  ELSE
    UPDATE public.contas_receber
       SET status = 'CANCELADO',
           motivo_cancelamento = trim(p_motivo),
           data_cancelamento = now(),
           usuario_cancelamento_id = auth.uid(),
           cancelamento_idempotency_key = p_idempotency_key
     WHERE id = p_titulo_id;
  END IF;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    p_titulo_id, 'CANCELAMENTO', p_titulo_id, p_tipo_titulo, 'CANCELAMENTO',
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'CANCELADO'),
    trim(p_motivo)
  );

  RETURN jsonb_build_object(
    'titulo_id', p_titulo_id,
    'idempotente', false,
    'status', 'CANCELADO'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.financeiro_estornar_liquidacao(p_liquidacao_id uuid, p_motivo text, p_idempotency_key uuid, p_ticket_autorizacao uuid DEFAULT NULL::uuid, p_data_contabil date DEFAULT NULL::date)
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
     AND NOT public.has_role(auth.uid(), 'novus_owner') THEN
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

CREATE OR REPLACE FUNCTION public.financeiro_liquidar_titulo(p_titulo_id uuid, p_tipo_titulo text, p_valor numeric, p_data_pagamento date, p_forma_pagamento text, p_idempotency_key uuid, p_conta_bancaria_id uuid DEFAULT NULL::uuid, p_observacoes text DEFAULT NULL::text, p_multi_baixa jsonb DEFAULT '[]'::jsonb, p_ticket_autorizacao uuid DEFAULT NULL::uuid, p_juros numeric DEFAULT 0, p_multa numeric DEFAULT 0, p_desconto numeric DEFAULT 0, p_movimentacao_bancaria_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_liquidacao_id uuid;
  v_movimentacao_id uuid;
  v_valor_original numeric;
  v_valor_anterior numeric;
  v_valor_total numeric;
  v_saldo_anterior numeric;
  v_saldo_posterior numeric;
  v_status_atual text;
  v_status_novo text;
  v_descricao text;
  v_numero_documento text;
  v_natureza_id uuid;
  v_plano_conta_id uuid;
  v_centro_custo_id uuid;
  v_tipo_movimentacao text;
  v_baixa jsonb;
  v_baixa_conta_id uuid;
  v_baixa_valor numeric;
  v_soma_multibaixa numeric := 0;
  v_valor_efetivo numeric;
  v_mov_existente_conta_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM financeiro_exigir_permissao('financeiro.liquidar');

  -- Lookup preliminar só pra resolver a empresa antes da checagem
  -- retroativa (o SELECT completo mais abaixo repete isso, sem problema).
  IF p_tipo_titulo = 'CONTAS_RECEBER' THEN
    SELECT empresa_representada_id INTO v_empresa_id FROM public.contas_receber WHERE id = p_titulo_id AND deleted_at IS NULL;
  ELSE
    SELECT empresa_representada_id INTO v_empresa_id FROM public.contas_pagar WHERE id = p_titulo_id AND deleted_at IS NULL;
  END IF;

  IF v_empresa_id IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'novus_owner')
              OR public.has_permissao(auth.uid(), 'financeiro.lancamentoRetroativo'))
  THEN
    DECLARE
      v_limite numeric;
    BEGIN
      SELECT limite_lancamento_retroativo_horas INTO v_limite
        FROM public.empresas_representadas WHERE id = v_empresa_id;
      IF v_limite IS NOT NULL
         AND public.horas_uteis_decorridas(p_data_pagamento::timestamptz, now()) > v_limite THEN
        PERFORM financeiro_exigir_autorizacao_titulo(
          p_ticket_autorizacao, 'LIQUIDACAO_RETROATIVA', p_tipo_titulo, p_titulo_id);
      END IF;
    END;
  END IF;

  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
  -- Determinado cedo (não depende de nenhum outro cálculo): usado tanto na
  -- validação de vínculo de movimentação existente quanto, mais abaixo, na
  -- criação de uma nova (reatribuição redundante lá, mantida como estava).
  v_tipo_movimentacao := CASE WHEN p_tipo_titulo = 'CONTAS_RECEBER' THEN 'DEPOSITO' ELSE 'SAQUE' END;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor da liquidacao deve ser maior que zero';
  END IF;
  IF p_data_pagamento IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Data e chave de idempotencia sao obrigatorias';
  END IF;
  IF jsonb_typeof(COALESCE(p_multi_baixa, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Divisao da baixa deve ser uma lista';
  END IF;

  IF p_tipo_titulo = 'CONTAS_RECEBER' THEN
    SELECT empresa_representada_id, valor_original, COALESCE(valor_recebido, 0), status,
           descricao, numero_documento, natureza_id, plano_conta_id, centro_custo_id
      INTO v_empresa_id, v_valor_original, v_valor_anterior, v_status_atual,
           v_descricao, v_numero_documento, v_natureza_id, v_plano_conta_id, v_centro_custo_id
      FROM public.contas_receber
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    SELECT empresa_representada_id, valor_original, COALESCE(valor_pago, 0), status,
           descricao, numero_documento, natureza_id, plano_conta_id, centro_custo_id
      INTO v_empresa_id, v_valor_original, v_valor_anterior, v_status_atual,
           v_descricao, v_numero_documento, v_natureza_id, v_plano_conta_id, v_centro_custo_id
      FROM public.contas_pagar
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Titulo nao encontrado';
  END IF;
  IF NOT public.user_has_access_to_empresa(v_empresa_id)
     AND NOT public.has_role(auth.uid(), 'novus_owner') THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_liquidacao_id
    FROM public.liquidacoes_titulos
   WHERE empresa_representada_id = v_empresa_id
     AND idempotency_key = p_idempotency_key;
  IF v_liquidacao_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'liquidacao_id', v_liquidacao_id, 'idempotente', true,
      'status', v_status_atual,
      'saldo_posterior', GREATEST(v_valor_original - v_valor_anterior, 0)
    );
  END IF;

  IF v_status_atual = 'CANCELADO' THEN
    RAISE EXCEPTION 'Titulo cancelado nao pode ser liquidado';
  END IF;

  v_saldo_anterior := GREATEST(v_valor_original - v_valor_anterior, 0);
  IF v_saldo_anterior = 0 THEN
    RAISE EXCEPTION 'Titulo ja liquidado';
  END IF;
  IF p_valor > v_saldo_anterior THEN
    RAISE EXCEPTION 'Valor informado excede o saldo do titulo';
  END IF;

  IF COALESCE(p_juros, 0) < 0 OR COALESCE(p_multa, 0) < 0 OR COALESCE(p_desconto, 0) < 0 THEN
    RAISE EXCEPTION 'Juros, multa e desconto nao podem ser negativos';
  END IF;

  -- O principal (p_valor) abate o saldo do titulo; juros e multa acrescem e desconto
  -- abate o que de fato circula no banco. Titulo de 100 pago com 10 de juros fica
  -- quitado, e 110 entram no caixa.
  v_valor_efetivo := p_valor + COALESCE(p_juros, 0) + COALESCE(p_multa, 0) - COALESCE(p_desconto, 0);
  IF v_valor_efetivo < 0 THEN
    RAISE EXCEPTION 'Desconto maior que o valor da baixa com acrescimos';
  END IF;

  v_valor_total := v_valor_anterior + p_valor;
  v_saldo_posterior := v_valor_original - v_valor_total;
  v_status_novo := CASE
    WHEN v_saldo_posterior = 0 AND p_tipo_titulo = 'CONTAS_RECEBER' THEN 'RECEBIDO'
    WHEN v_saldo_posterior = 0 THEN 'PAGO'
    ELSE 'PARCIAL'
  END;

  IF p_movimentacao_bancaria_id IS NOT NULL THEN
    IF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 OR p_conta_bancaria_id IS NOT NULL THEN
      RAISE EXCEPTION 'Vincular uma movimentacao existente nao pode ser combinado com divisao entre contas ou conta bancaria para nova movimentacao';
    END IF;
    SELECT conta_bancaria_id INTO v_mov_existente_conta_id
      FROM public.movimentacoes_bancarias
     WHERE id = p_movimentacao_bancaria_id
       AND empresa_representada_id = v_empresa_id
       AND ativo = true
       AND estornado = false
       AND liquidacao_titulo_id IS NULL
       AND tipo_movimentacao = v_tipo_movimentacao
       AND round(valor, 2) = round(v_valor_efetivo, 2)
     FOR UPDATE;
    IF v_mov_existente_conta_id IS NULL THEN
      RAISE EXCEPTION 'Movimentacao bancaria indisponivel para vinculo: nao encontrada, ja vinculada a outro titulo, estornada, ou valor/tipo nao corresponde (esperado % de %)',
        v_tipo_movimentacao, v_valor_efetivo;
    END IF;
  ELSIF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
    FOR v_baixa IN SELECT value FROM jsonb_array_elements(p_multi_baixa)
    LOOP
      v_baixa_conta_id := NULLIF(v_baixa->>'conta_bancaria_id', '')::uuid;
      v_baixa_valor := NULLIF(v_baixa->>'valor', '')::numeric;
      IF v_baixa_conta_id IS NULL OR v_baixa_valor IS NULL OR v_baixa_valor <= 0 THEN
        RAISE EXCEPTION 'Conta e valor positivo sao obrigatorios em cada divisao';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.contas_bancarias
         WHERE id = v_baixa_conta_id AND empresa_representada_id = v_empresa_id
           AND deleted_at IS NULL AND ativo = true
      ) THEN
        RAISE EXCEPTION 'Conta bancaria invalida para a empresa';
      END IF;
      v_soma_multibaixa := v_soma_multibaixa + v_baixa_valor;
    END LOOP;
    IF v_soma_multibaixa <> v_valor_efetivo THEN
      RAISE EXCEPTION 'Soma da divisao difere do valor da liquidacao';
    END IF;
  ELSIF p_conta_bancaria_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contas_bancarias
       WHERE id = p_conta_bancaria_id AND empresa_representada_id = v_empresa_id
         AND deleted_at IS NULL AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Conta bancaria invalida para a empresa';
    END IF;
  ELSIF p_forma_pagamento <> 'DINHEIRO' THEN
    RAISE EXCEPTION 'Conta bancaria obrigatoria para esta forma de pagamento';
  END IF;

  INSERT INTO public.liquidacoes_titulos (
    empresa_representada_id, conta_pagar_id, conta_receber_id, titulo_id, tipo_titulo,
    data_liquidacao, data_pagamento, valor_pago, valor_original_titulo, forma_pagamento,
    conta_bancaria_id, observacoes, usuario_liquidacao_id, idempotency_key,
    valor_juros, valor_multa, valor_desconto
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN p_titulo_id END,
    CASE WHEN p_tipo_titulo = 'CONTAS_RECEBER' THEN p_titulo_id END,
    p_titulo_id, p_tipo_titulo, p_data_pagamento, p_data_pagamento, p_valor,
    v_valor_original, p_forma_pagamento, COALESCE(p_conta_bancaria_id, v_mov_existente_conta_id), p_observacoes,
    auth.uid(), p_idempotency_key,
    COALESCE(p_juros, 0), COALESCE(p_multa, 0), COALESCE(p_desconto, 0)
  ) RETURNING id INTO v_liquidacao_id;

  IF p_tipo_titulo = 'CONTAS_RECEBER' THEN
    UPDATE public.contas_receber
       SET valor_recebido = v_valor_total,
           data_recebimento = CASE WHEN v_status_novo = 'RECEBIDO' THEN p_data_pagamento ELSE NULL END,
           status = v_status_novo
     WHERE id = p_titulo_id;
    v_tipo_movimentacao := 'DEPOSITO';
  ELSE
    UPDATE public.contas_pagar
       SET valor_pago = v_valor_total,
           data_pagamento = CASE WHEN v_status_novo = 'PAGO' THEN p_data_pagamento ELSE NULL END,
           status = v_status_novo
     WHERE id = p_titulo_id;
    v_tipo_movimentacao := 'SAQUE';
  END IF;

  IF p_movimentacao_bancaria_id IS NOT NULL THEN
    UPDATE public.movimentacoes_bancarias
       SET liquidacao_titulo_id = v_liquidacao_id
     WHERE id = p_movimentacao_bancaria_id
     RETURNING id INTO v_movimentacao_id;
  ELSIF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
    FOR v_baixa IN SELECT value FROM jsonb_array_elements(p_multi_baixa)
    LOOP
      v_baixa_conta_id := (v_baixa->>'conta_bancaria_id')::uuid;
      v_baixa_valor := (v_baixa->>'valor')::numeric;
      INSERT INTO public.liquidacoes_multiplas (
        empresa_representada_id, data_liquidacao, forma_pagamento, valor_total,
        liquidacao_principal_id, conta_bancaria_id, valor, observacoes
      ) VALUES (
        v_empresa_id, p_data_pagamento, p_forma_pagamento, v_baixa_valor,
        v_liquidacao_id, v_baixa_conta_id, v_baixa_valor, v_baixa->>'observacoes'
      );

      INSERT INTO public.movimentacoes_bancarias (
        empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor,
        data_lancamento, data_movimentacao, descricao, numero_documento, documento_referencia,
        status, natureza_id, plano_conta_id, centro_custo_id, created_by,
        usuario_criacao_id, liquidacao_titulo_id
      ) VALUES (
        v_empresa_id, v_baixa_conta_id, v_tipo_movimentacao, v_tipo_movimentacao, v_baixa_valor,
        p_data_pagamento, p_data_pagamento, 'Liquidacao: ' || v_descricao,
        v_numero_documento, v_numero_documento, 'EFETIVADO', v_natureza_id,
        v_plano_conta_id, v_centro_custo_id, auth.uid(), auth.uid(), v_liquidacao_id
      );
    END LOOP;
  ELSIF p_conta_bancaria_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_bancarias (
      empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor,
      data_lancamento, data_movimentacao, descricao, numero_documento, documento_referencia,
      status, natureza_id, plano_conta_id, centro_custo_id, created_by,
      usuario_criacao_id, liquidacao_titulo_id
    ) VALUES (
      v_empresa_id, p_conta_bancaria_id, v_tipo_movimentacao, v_tipo_movimentacao, v_valor_efetivo,
      p_data_pagamento, p_data_pagamento, 'Liquidacao: ' || v_descricao,
      v_numero_documento, v_numero_documento, 'EFETIVADO', v_natureza_id,
      v_plano_conta_id, v_centro_custo_id, auth.uid(), auth.uid(), v_liquidacao_id
    ) RETURNING id INTO v_movimentacao_id;
  END IF;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, valor_movimentado, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    p_titulo_id, 'LIQUIDACAO', p_titulo_id, p_tipo_titulo, 'LIQUIDACAO', p_valor,
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('status', v_status_atual, 'valor_liquidado', v_valor_anterior),
    jsonb_build_object('status', v_status_novo, 'valor_liquidado', v_valor_total,
                       'liquidacao_id', v_liquidacao_id, 'movimentacao_id', v_movimentacao_id),
    p_observacoes
  );

  RETURN jsonb_build_object(
    'liquidacao_id', v_liquidacao_id, 'movimentacao_id', v_movimentacao_id,
    'idempotente', false, 'status', v_status_novo, 'saldo_posterior', v_saldo_posterior,
    'valor_efetivo', v_valor_efetivo
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.financeiro_renegociar_titulo(p_titulo_id uuid, p_tipo_titulo text, p_motivo text, p_idempotency_key uuid, p_novas_parcelas jsonb, p_ticket_autorizacao uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_status text;
  v_valor_original numeric;
  v_valor_liquidado numeric;
  v_saldo numeric;
  v_chave_existente uuid;
  v_numero_documento text;
  v_pessoa_id uuid;
  v_plano_conta_id uuid;
  v_centro_custo_id uuid;
  v_natureza_id uuid;
  v_descricao text;
  v_parcela jsonb;
  v_soma_parcelas numeric := 0;
  v_total_parcelas int;
  v_novo_id uuid;
  v_novos_ids uuid[] := '{}';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM financeiro_exigir_permissao('financeiro.renegociacao');
  PERFORM financeiro_exigir_autorizacao_titulo(
    p_ticket_autorizacao, 'RENEGOCIACAO', p_tipo_titulo, p_titulo_id);

  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotencia obrigatoria';
  END IF;
  IF length(trim(COALESCE(p_motivo, ''))) < 5 THEN
    RAISE EXCEPTION 'Motivo da renegociacao deve ter ao menos 5 caracteres';
  END IF;
  IF jsonb_typeof(COALESCE(p_novas_parcelas, 'null'::jsonb)) <> 'array'
     OR jsonb_array_length(p_novas_parcelas) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela nova';
  END IF;

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    SELECT empresa_representada_id, status, valor_original, COALESCE(valor_pago, 0),
           renegociacao_idempotency_key, numero_documento, fornecedor_id,
           plano_conta_id, centro_custo_id, natureza_id, descricao
      INTO v_empresa_id, v_status, v_valor_original, v_valor_liquidado,
           v_chave_existente, v_numero_documento, v_pessoa_id,
           v_plano_conta_id, v_centro_custo_id, v_natureza_id, v_descricao
      FROM public.contas_pagar
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    SELECT empresa_representada_id, status, valor_original, COALESCE(valor_recebido, 0),
           renegociacao_idempotency_key, numero_documento, cliente_id,
           plano_conta_id, centro_custo_id, natureza_id, descricao
      INTO v_empresa_id, v_status, v_valor_original, v_valor_liquidado,
           v_chave_existente, v_numero_documento, v_pessoa_id,
           v_plano_conta_id, v_centro_custo_id, v_natureza_id, v_descricao
      FROM public.contas_receber
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Titulo nao encontrado';
  END IF;
  IF NOT public.user_has_access_to_empresa(v_empresa_id)
     AND NOT public.has_role(auth.uid(), 'novus_owner') THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;

  IF v_chave_existente IS NOT NULL AND v_chave_existente = p_idempotency_key THEN
    SELECT array_agg(id) INTO v_novos_ids
      FROM (
        SELECT id FROM public.contas_pagar WHERE renegociado_de_id = p_titulo_id
        UNION ALL
        SELECT id FROM public.contas_receber WHERE renegociado_de_id = p_titulo_id
      ) x;
    RETURN jsonb_build_object(
      'titulo_id', p_titulo_id, 'idempotente', true,
      'status', 'RENEGOCIADO', 'novos_titulos_ids', to_jsonb(COALESCE(v_novos_ids, '{}'::uuid[]))
    );
  END IF;

  IF v_status IN ('CANCELADO', 'RENEGOCIADO') THEN
    RAISE EXCEPTION 'Titulo com status % nao pode ser renegociado', v_status;
  END IF;
  IF v_status IN ('PAGO', 'RECEBIDO') THEN
    RAISE EXCEPTION 'Titulo ja esta totalmente liquidado, nao ha saldo para renegociar';
  END IF;

  v_saldo := v_valor_original - v_valor_liquidado;
  IF v_saldo <= 0 THEN
    RAISE EXCEPTION 'Titulo sem saldo em aberto para renegociar';
  END IF;

  FOR v_parcela IN SELECT value FROM jsonb_array_elements(p_novas_parcelas)
  LOOP
    IF NULLIF(v_parcela->>'valor', '') IS NULL OR (v_parcela->>'valor')::numeric <= 0 THEN
      RAISE EXCEPTION 'Cada parcela precisa de um valor maior que zero';
    END IF;
    IF NULLIF(v_parcela->>'data_vencimento', '') IS NULL THEN
      RAISE EXCEPTION 'Cada parcela precisa de data de vencimento';
    END IF;
    v_soma_parcelas := v_soma_parcelas + (v_parcela->>'valor')::numeric;
  END LOOP;

  IF round(v_soma_parcelas, 2) <> round(v_saldo, 2) THEN
    RAISE EXCEPTION 'Soma das novas parcelas (%) precisa ser igual ao saldo em aberto (%)',
      v_soma_parcelas, v_saldo;
  END IF;

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    UPDATE public.contas_pagar
       SET status = 'RENEGOCIADO',
           motivo_renegociacao = trim(p_motivo),
           data_renegociacao = now(),
           usuario_renegociacao_id = auth.uid(),
           renegociacao_idempotency_key = p_idempotency_key
     WHERE id = p_titulo_id;
  ELSE
    UPDATE public.contas_receber
       SET status = 'RENEGOCIADO',
           motivo_renegociacao = trim(p_motivo),
           data_renegociacao = now(),
           usuario_renegociacao_id = auth.uid(),
           renegociacao_idempotency_key = p_idempotency_key
     WHERE id = p_titulo_id;
  END IF;

  v_total_parcelas := jsonb_array_length(p_novas_parcelas);

  FOR v_parcela IN SELECT value FROM jsonb_array_elements(p_novas_parcelas)
  LOOP
    IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
      INSERT INTO public.contas_pagar (
        empresa_representada_id, fornecedor_id, numero_documento, descricao,
        valor_original, data_emissao, data_vencimento, status,
        plano_conta_id, centro_custo_id, natureza_id,
        numero_parcela, total_parcelas, renegociado_de_id
      ) VALUES (
        v_empresa_id, v_pessoa_id,
        COALESCE(v_numero_documento, '') || '-R' || COALESCE(v_parcela->>'numero', ''),
        COALESCE(v_descricao, '') || ' (renegociação)',
        (v_parcela->>'valor')::numeric, CURRENT_DATE, (v_parcela->>'data_vencimento')::date, 'PENDENTE',
        v_plano_conta_id, v_centro_custo_id, v_natureza_id,
        NULLIF(v_parcela->>'numero', '')::int, v_total_parcelas, p_titulo_id
      ) RETURNING id INTO v_novo_id;
    ELSE
      INSERT INTO public.contas_receber (
        empresa_representada_id, cliente_id, numero_documento, descricao,
        valor_original, data_emissao, data_vencimento, status,
        plano_conta_id, centro_custo_id, natureza_id,
        numero_parcela, total_parcelas, renegociado_de_id
      ) VALUES (
        v_empresa_id, v_pessoa_id,
        COALESCE(v_numero_documento, '') || '-R' || COALESCE(v_parcela->>'numero', ''),
        COALESCE(v_descricao, '') || ' (renegociação)',
        (v_parcela->>'valor')::numeric, CURRENT_DATE, (v_parcela->>'data_vencimento')::date, 'PENDENTE',
        v_plano_conta_id, v_centro_custo_id, v_natureza_id,
        NULLIF(v_parcela->>'numero', '')::int, v_total_parcelas, p_titulo_id
      ) RETURNING id INTO v_novo_id;
    END IF;
    v_novos_ids := array_append(v_novos_ids, v_novo_id);
  END LOOP;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, valor_movimentado, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    p_titulo_id, 'RENEGOCIACAO', p_titulo_id, p_tipo_titulo, 'RENEGOCIACAO', v_saldo,
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('status', v_status, 'saldo', v_saldo),
    jsonb_build_object('status', 'RENEGOCIADO', 'novos_titulos_ids', to_jsonb(v_novos_ids)),
    trim(p_motivo)
  );

  RETURN jsonb_build_object(
    'titulo_id', p_titulo_id,
    'idempotente', false,
    'status', 'RENEGOCIADO',
    'saldo_renegociado', v_saldo,
    'novos_titulos_ids', to_jsonb(v_novos_ids)
  );
END;
$function$;
