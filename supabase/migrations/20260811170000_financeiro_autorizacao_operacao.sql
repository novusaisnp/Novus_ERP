-- Trava de operacao financeira sensivel com autorizacao de usuario permissionado (FIN-0).
--
-- Regras acordadas:
--   - baixa com data de pagamento anterior a agora menos 24h exige autorizacao;
--   - estorno e cancelamento exigem autorizacao sempre;
--   - toda autorizacao fica registrada: quem pediu, quem autorizou, quando e com que contexto.
--
-- O ticket e emitido fora do Postgres (edge function `financeiro-autorizar`), que e quem
-- valida a senha do autorizador. A senha nunca chega ao banco nem a log de query; aqui so
-- trafega o ticket, de uso unico e vida curta.

-- ---------------------------------------------------------------------------
-- Permissao de um usuario qualquer, nao apenas o da sessao
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.financeiro_pode_usuario(p_user_id uuid, p_acao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_user_id IS NOT NULL
     AND (
       has_role(p_user_id, 'admin'::app_role)
       OR has_role(p_user_id, 'novus_owner'::app_role)
       OR EXISTS (
         SELECT 1
         FROM usuarios u
         JOIN perfis_acesso pa ON pa.id = u.perfil_id
         WHERE u.user_id = p_user_id
           AND u.ativo
           AND pa.ativo
           AND (
             pa.permissoes ? p_acao
             OR pa.permissoes ? CASE p_acao
                  WHEN 'financeiro.liquidar' THEN 'financeiro.create'
                  WHEN 'financeiro.cancelamento' THEN 'financeiro.estorno'
                  ELSE p_acao
                END
           )
       )
     );
$$;

-- `financeiro_pode` passa a ser o caso particular do usuario da sessao.
CREATE OR REPLACE FUNCTION public.financeiro_pode(p_acao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND financeiro_pode_usuario(auth.uid(), p_acao);
$$;

-- ---------------------------------------------------------------------------
-- Registro de autorizacoes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.autorizacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  ticket uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  acao text NOT NULL CHECK (acao IN ('LIQUIDACAO_RETROATIVA', 'ESTORNO', 'CANCELAMENTO')),
  solicitante_user_id uuid NOT NULL,
  autorizador_user_id uuid NOT NULL,
  justificativa text NOT NULL,
  contexto jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL,
  consumido_em timestamptz,
  consumido_ref uuid
);

COMMENT ON TABLE public.autorizacoes_financeiras IS
  'Trilha de autorizacoes de operacao financeira sensivel. Somente leitura para a aplicacao: '
  'a emissao ocorre na edge function e o consumo dentro das RPCs financeiras.';

CREATE INDEX IF NOT EXISTS idx_autorizacoes_financeiras_empresa
  ON public.autorizacoes_financeiras (empresa_representada_id, criado_em DESC);

ALTER TABLE public.autorizacoes_financeiras ENABLE ROW LEVEL SECURITY;

-- Leitura para auditoria dentro da propria empresa. Escrita nunca vem do cliente:
-- a emissao usa service_role e o consumo acontece dentro de funcao SECURITY DEFINER.
DROP POLICY IF EXISTS autorizacoes_financeiras_select ON public.autorizacoes_financeiras;
CREATE POLICY autorizacoes_financeiras_select
  ON public.autorizacoes_financeiras FOR SELECT
  USING (
    empresa_representada_id = get_user_empresa_id()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'novus_owner'::app_role)
  );

-- ---------------------------------------------------------------------------
-- Consumo do ticket
-- ---------------------------------------------------------------------------

-- Consome o ticket para uma acao/empresa. Uso unico: o UPDATE so acha a linha enquanto
-- `consumido_em` for NULL, entao duas chamadas concorrentes nao aproveitam o mesmo ticket.
-- Levanta 28000 quando falta autorizacao valida; a UI usa esse codigo para abrir o dialogo.
CREATE OR REPLACE FUNCTION public.financeiro_consumir_autorizacao(
  p_ticket uuid,
  p_acao text,
  p_empresa_id uuid,
  p_referencia uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_ticket IS NULL THEN
    RAISE EXCEPTION 'Operacao exige autorizacao de usuario permissionado (%)', p_acao
      USING ERRCODE = '28000';
  END IF;

  UPDATE autorizacoes_financeiras
     SET consumido_em = now(),
         consumido_ref = p_referencia
   WHERE ticket = p_ticket
     AND acao = p_acao
     AND empresa_representada_id = p_empresa_id
     AND consumido_em IS NULL
     AND expira_em > now()
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Autorizacao invalida, expirada ou ja utilizada para %', p_acao
      USING ERRCODE = '28000';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.financeiro_pode_usuario(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Janela de retroatividade
-- ---------------------------------------------------------------------------

-- ponytail: 24h fixo em uma funcao unica; se algum dia variar por empresa, o lugar de mudar
-- e aqui, sem cacar a constante espalhada pelas RPCs.
CREATE OR REPLACE FUNCTION public.financeiro_limite_retroativo()
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$ SELECT interval '24 hours' $$;

-- ---------------------------------------------------------------------------
-- Fachadas usadas pelas RPCs
-- ---------------------------------------------------------------------------

-- Resolve a empresa do titulo por conta propria, para o guard caber logo no topo das RPCs,
-- antes de qualquer leitura ou escrita do fluxo principal.
CREATE OR REPLACE FUNCTION public.financeiro_exigir_autorizacao_titulo(
  p_ticket uuid,
  p_acao text,
  p_tipo_titulo text,
  p_titulo_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    SELECT empresa_representada_id INTO v_empresa_id FROM contas_pagar WHERE id = p_titulo_id;
  ELSE
    SELECT empresa_representada_id INTO v_empresa_id FROM contas_receber WHERE id = p_titulo_id;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Titulo nao encontrado';
  END IF;

  PERFORM financeiro_consumir_autorizacao(p_ticket, p_acao, v_empresa_id, p_titulo_id);
END;
$$;

-- Mesma ideia para o estorno, que identifica a liquidacao e nao o titulo.
CREATE OR REPLACE FUNCTION public.financeiro_exigir_autorizacao_liquidacao(
  p_ticket uuid,
  p_liquidacao_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id
    FROM liquidacoes_titulos WHERE id = p_liquidacao_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Liquidacao nao encontrada';
  END IF;

  PERFORM financeiro_consumir_autorizacao(p_ticket, 'ESTORNO', v_empresa_id, p_liquidacao_id);
END;
$$;
-- financeiro_cancelar_titulo: ticket de autorizacao adicionado; restante do corpo inalterado.
DROP FUNCTION IF EXISTS public.financeiro_cancelar_titulo(uuid, text, text, uuid);
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
     AND NOT public.has_role(auth.uid(), 'admin') THEN
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
$function$
;

-- financeiro_estornar_liquidacao: ticket de autorizacao adicionado; restante do corpo inalterado.
DROP FUNCTION IF EXISTS public.financeiro_estornar_liquidacao(uuid, text, uuid);
CREATE OR REPLACE FUNCTION public.financeiro_estornar_liquidacao(p_liquidacao_id uuid, p_motivo text, p_idempotency_key uuid, p_ticket_autorizacao uuid DEFAULT NULL::uuid)
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

  SELECT empresa_representada_id,
         COALESCE(titulo_id, conta_pagar_id, conta_receber_id),
         COALESCE(tipo_titulo,
           CASE WHEN conta_pagar_id IS NOT NULL THEN 'CONTAS_PAGAR'
                WHEN conta_receber_id IS NOT NULL THEN 'CONTAS_RECEBER' END),
         valor_pago, estornado, estorno_idempotency_key
    INTO v_empresa_id, v_titulo_id, v_tipo_titulo, v_valor_estornado,
         v_ja_estornado, v_chave_existente
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
         estorno_idempotency_key = p_idempotency_key
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
                       'movimentacoes_estornadas', v_movimentacoes_afetadas),
    trim(p_motivo)
  );

  RETURN jsonb_build_object(
    'liquidacao_id', p_liquidacao_id,
    'idempotente', false,
    'status', v_status_novo,
    'valor_estornado', v_valor_estornado,
    'valor_liquidado_restante', v_valor_restante,
    'movimentacoes_estornadas', v_movimentacoes_afetadas
  );
END;
$function$
;

-- financeiro_liquidar_titulo: ticket de autorizacao adicionado; restante do corpo inalterado.
DROP FUNCTION IF EXISTS public.financeiro_liquidar_titulo(uuid, text, numeric, date, text, uuid, uuid, text, jsonb);
CREATE OR REPLACE FUNCTION public.financeiro_liquidar_titulo(p_titulo_id uuid, p_tipo_titulo text, p_valor numeric, p_data_pagamento date, p_forma_pagamento text, p_idempotency_key uuid, p_conta_bancaria_id uuid DEFAULT NULL::uuid, p_observacoes text DEFAULT NULL::text, p_multi_baixa jsonb DEFAULT '[]'::jsonb, p_ticket_autorizacao uuid DEFAULT NULL::uuid)
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM financeiro_exigir_permissao('financeiro.liquidar');
  IF p_data_pagamento::timestamptz < now() - financeiro_limite_retroativo() THEN
    PERFORM financeiro_exigir_autorizacao_titulo(
      p_ticket_autorizacao, 'LIQUIDACAO_RETROATIVA', p_tipo_titulo, p_titulo_id);
  END IF;
  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
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
     AND NOT public.has_role(auth.uid(), 'admin') THEN
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

  v_valor_total := v_valor_anterior + p_valor;
  v_saldo_posterior := v_valor_original - v_valor_total;
  v_status_novo := CASE
    WHEN v_saldo_posterior = 0 AND p_tipo_titulo = 'CONTAS_RECEBER' THEN 'RECEBIDO'
    WHEN v_saldo_posterior = 0 THEN 'PAGO'
    ELSE 'PARCIAL'
  END;

  IF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
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
    IF v_soma_multibaixa <> p_valor THEN
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
    conta_bancaria_id, observacoes, usuario_liquidacao_id, idempotency_key
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN p_titulo_id END,
    CASE WHEN p_tipo_titulo = 'CONTAS_RECEBER' THEN p_titulo_id END,
    p_titulo_id, p_tipo_titulo, p_data_pagamento, p_data_pagamento, p_valor,
    v_valor_original, p_forma_pagamento, p_conta_bancaria_id, p_observacoes,
    auth.uid(), p_idempotency_key
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

  IF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
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
      v_empresa_id, p_conta_bancaria_id, v_tipo_movimentacao, v_tipo_movimentacao, p_valor,
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
    'idempotente', false, 'status', v_status_novo, 'saldo_posterior', v_saldo_posterior
  );
END;
$function$
;
