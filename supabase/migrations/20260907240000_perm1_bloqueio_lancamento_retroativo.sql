-- PERM-1: bloqueio genérico de lançamento retroativo, configurável por
-- empresa, usando permissão granular (has_permissao) em vez de admin
-- genérico ou trava fixa. Generaliza o mecanismo que só existia para
-- liquidação financeira (ticket LIQUIDACAO_RETROATIVA, janela fixa de 24h
-- corridas) para Estoque, Vendas e Movimentações Bancárias, e finalmente
-- consome `financeiro.lancamentoRetroativo` — permissão que existe no
-- catálogo desde a criação (2026-07-10) mas nunca foi checada em lugar
-- nenhum.
--
-- Vendas e Estoque inserem direto na tabela (sem RPC) — um gate só em
-- parâmetro de RPC não cobriria esses casos. Por isso o mecanismo é trigger
-- no banco: BEFORE INSERT/UPDATE da coluna de data, cobre qualquer caminho
-- de escrita.
--
-- Regra: has_role(admin/novus_owner) ou has_permissao(<modulo>.lancamentoRetroativo)
-- libera sem restrição. Sem a permissão, o lançamento só é aceito se estiver
-- dentro do limite de HORAS ÚTEIS configurado pela empresa em
-- empresas_representadas.limite_lancamento_retroativo_horas (NULL = sem
-- limite, "trava liberada" — cada empresa decide como quer trabalhar).
-- "Hora útil" aqui = dia útil conta 24h inteiras; só pula fim de semana e
-- feriado nacional por inteiro (não restringe horário comercial dentro do
-- dia). Sem ticket de exceção pontual nestes 3 módulos novos — quem precisa
-- lançar retroativo com frequência recebe a permissão, e quem não precisa
-- nunca vai pedir; Financeiro mantém o ticket que já existia em produção.

-- 1) Feriados nacionais fixos + móveis (calculados via Páscoa, algoritmo de
-- Meeus/Jones/Butcher). Só nacionais — sem estadual/municipal por empresa.
CREATE OR REPLACE FUNCTION public.pascoa(p_ano int)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int;
  v_mes int; v_dia int;
BEGIN
  a := p_ano % 19;
  b := p_ano / 100;
  c := p_ano % 100;
  d := b / 4;
  e := b % 4;
  f := (b + 8) / 25;
  g := (b - f + 1) / 3;
  h := (19*a + b - d - g + 15) % 30;
  i := c / 4;
  k := c % 4;
  l := (32 + 2*e + 2*i - h - k) % 7;
  m := (a + 11*h + 22*l) / 451;
  v_mes := (h + l - 7*m + 114) / 31;
  v_dia := ((h + l - 7*m + 114) % 31) + 1;
  RETURN make_date(p_ano, v_mes, v_dia);
END;
$$;
REVOKE ALL ON FUNCTION public.pascoa(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pascoa(int) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.feriados_nacionais (
  data date PRIMARY KEY,
  nome text NOT NULL,
  movel boolean NOT NULL DEFAULT false
);
ALTER TABLE public.feriados_nacionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY feriados_nacionais_select ON public.feriados_nacionais
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.feriados_nacionais FROM anon;
GRANT SELECT ON public.feriados_nacionais TO authenticated;
GRANT ALL ON public.feriados_nacionais TO service_role;

-- Faixa 2020-2035: cobre o passado recente (relatórios/proofs sintéticos já
-- usam datas de 2020) e mais de uma década à frente. Passado esse horizonte,
-- inserir novas linhas manualmente — não há cálculo automático de faixa.
INSERT INTO public.feriados_nacionais (data, nome, movel)
SELECT (ano || '-01-01')::date, 'Confraternização Universal', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-04-21')::date, 'Tiradentes', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-05-01')::date, 'Dia do Trabalho', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-09-07')::date, 'Independência do Brasil', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-10-12')::date, 'Nossa Senhora Aparecida', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-11-02')::date, 'Finados', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-11-15')::date, 'Proclamação da República', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-11-20')::date, 'Dia Nacional de Zumbi e da Consciência Negra', false FROM generate_series(2020,2035) ano
UNION ALL SELECT (ano || '-12-25')::date, 'Natal', false FROM generate_series(2020,2035) ano
UNION ALL SELECT public.pascoa(ano) - 47, 'Carnaval (segunda)', true FROM generate_series(2020,2035) ano
UNION ALL SELECT public.pascoa(ano) - 46, 'Carnaval (terça)', true FROM generate_series(2020,2035) ano
UNION ALL SELECT public.pascoa(ano) - 2, 'Sexta-feira Santa', true FROM generate_series(2020,2035) ano
UNION ALL SELECT public.pascoa(ano) + 60, 'Corpus Christi', true FROM generate_series(2020,2035) ano
ON CONFLICT (data) DO NOTHING;

-- 2) Horas úteis decorridas entre dois instantes: dia útil conta 24h
-- inteiras (sem restringir horário comercial dentro do dia); fim de semana
-- e feriado nacional contam 0h, mesmo que parcialmente sobrepostos ao
-- intervalo. Calendário em America/Sao_Paulo.
CREATE OR REPLACE FUNCTION public.horas_uteis_decorridas(p_inicio timestamptz, p_fim timestamptz)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tz constant text := 'America/Sao_Paulo';
  v_total numeric := 0;
  v_dia date;
  v_dia_ini timestamptz;
  v_dia_fim timestamptz;
  v_overlap_ini timestamptz;
  v_overlap_fim timestamptz;
BEGIN
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim <= p_inicio THEN
    RETURN 0;
  END IF;
  FOR v_dia IN
    SELECT generate_series((p_inicio AT TIME ZONE v_tz)::date, (p_fim AT TIME ZONE v_tz)::date, interval '1 day')::date
  LOOP
    IF EXTRACT(ISODOW FROM v_dia) IN (6, 7)
       OR EXISTS (SELECT 1 FROM public.feriados_nacionais WHERE data = v_dia) THEN
      CONTINUE;
    END IF;
    v_dia_ini := v_dia::timestamp AT TIME ZONE v_tz;
    v_dia_fim := (v_dia + 1)::timestamp AT TIME ZONE v_tz;
    v_overlap_ini := GREATEST(p_inicio, v_dia_ini);
    v_overlap_fim := LEAST(p_fim, v_dia_fim);
    IF v_overlap_fim > v_overlap_ini THEN
      v_total := v_total + EXTRACT(EPOCH FROM (v_overlap_fim - v_overlap_ini)) / 3600;
    END IF;
  END LOOP;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.horas_uteis_decorridas(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.horas_uteis_decorridas(timestamptz, timestamptz) TO authenticated, service_role;

-- 3) Limite configurável por empresa. Default 48h úteis para todas as
-- empresas (novas e existentes) — era 0 (sem trava nenhuma) para
-- Estoque/Vendas/Bancárias e 24h corridas só para liquidação financeira;
-- este é o valor novo, unificado, que a auditoria de permissões pediu para
-- deixar de ser "catálogo sem consumidor". NULL = sem limite (trava
-- liberada), decisão de cada empresa.
ALTER TABLE public.empresas_representadas
  ADD COLUMN IF NOT EXISTS limite_lancamento_retroativo_horas numeric DEFAULT 48;

COMMENT ON COLUMN public.empresas_representadas.limite_lancamento_retroativo_horas IS
  'Horas úteis de tolerância para lançamentos retroativos (Estoque/Vendas/Bancárias/Financeiro) sem exigir permissão especial. NULL = sem limite. Editável em Configurações > Empresas, exige config.empresas.';

-- 4) Checagem genérica: dentro do limite (ou empresa sem limite) libera;
-- fora do limite, exige permissão do usuário; sem permissão, recusa com
-- mensagem acionável (nunca SQLSTATE cru).
CREATE OR REPLACE FUNCTION public.exigir_nao_retroativo(
  p_permissao text,
  p_data timestamptz,
  p_empresa_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limite numeric;
BEGIN
  IF p_data IS NULL THEN
    RETURN;
  END IF;

  SELECT limite_lancamento_retroativo_horas INTO v_limite
    FROM public.empresas_representadas WHERE id = p_empresa_id;

  IF v_limite IS NULL THEN
    RETURN; -- trava liberada para esta empresa
  END IF;

  IF public.horas_uteis_decorridas(p_data, now()) <= v_limite THEN
    RETURN;
  END IF;

  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'novus_owner')
     OR public.has_permissao(auth.uid(), p_permissao) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Lançamento retroativo além de % horas úteis exige a permissão "%" (ou o administrador da empresa pode ajustar/liberar o limite em Configurações > Empresas).', v_limite, p_permissao
    USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.exigir_nao_retroativo(text, timestamptz, uuid) FROM PUBLIC, anon, authenticated;

-- 5) Trigger genérico: lê a coluna de data via to_jsonb(NEW), serve
-- qualquer tabela sem repetir a função. TG_ARGV: permissao, coluna_data.
CREATE OR REPLACE FUNCTION public.trg_bloquear_lancamento_retroativo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_permissao text := TG_ARGV[0];
  v_coluna_data text := TG_ARGV[1];
  v_data timestamptz;
  v_empresa_id uuid;
  v_row jsonb := to_jsonb(NEW);
BEGIN
  v_data := (v_row->>v_coluna_data)::timestamptz;
  v_empresa_id := (v_row->>'empresa_representada_id')::uuid;
  PERFORM public.exigir_nao_retroativo(v_permissao, v_data, v_empresa_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_bloquear_lancamento_retroativo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_estoque_movimentacoes_retroativo ON public.estoque_movimentacoes;
CREATE TRIGGER trg_estoque_movimentacoes_retroativo
  BEFORE INSERT OR UPDATE OF data_movimento ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_lancamento_retroativo('estoque.lancamentoRetroativo', 'data_movimento');

DROP TRIGGER IF EXISTS trg_vendas_retroativo ON public.vendas;
CREATE TRIGGER trg_vendas_retroativo
  BEFORE INSERT OR UPDATE OF data_venda ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_lancamento_retroativo('vendas.lancamentoRetroativo', 'data_venda');

-- Gestão Bancária reaproveita `financeiro.lancamentoRetroativo` — não existe
-- módulo de permissão separado para bancário no catálogo, e movimentação
-- bancária já é domínio financeiro (concilia com liquidação).
DROP TRIGGER IF EXISTS trg_movimentacoes_bancarias_retroativo ON public.movimentacoes_bancarias;
CREATE TRIGGER trg_movimentacoes_bancarias_retroativo
  BEFORE INSERT OR UPDATE OF data_movimentacao ON public.movimentacoes_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.trg_bloquear_lancamento_retroativo('financeiro.lancamentoRetroativo', 'data_movimentacao');

-- 6) Financeiro: financeiro_liquidar_titulo ganha o mesmo bypass de
-- permissão + limite configurável por empresa antes de exigir o ticket que
-- já existia (LIQUIDACAO_RETROATIVA). Corpo idêntico ao de produção
-- (conferido via pg_get_functiondef antes desta migration), só com esse
-- trecho alterado — todo o resto é cópia exata.
DROP FUNCTION IF EXISTS public.financeiro_liquidar_titulo(uuid, text, numeric, date, text, uuid, uuid, text, jsonb, uuid, numeric, numeric, numeric);
CREATE OR REPLACE FUNCTION public.financeiro_liquidar_titulo(p_titulo_id uuid, p_tipo_titulo text, p_valor numeric, p_data_pagamento date, p_forma_pagamento text, p_idempotency_key uuid, p_conta_bancaria_id uuid DEFAULT NULL::uuid, p_observacoes text DEFAULT NULL::text, p_multi_baixa jsonb DEFAULT '[]'::jsonb, p_ticket_autorizacao uuid DEFAULT NULL::uuid, p_juros numeric DEFAULT 0, p_multa numeric DEFAULT 0, p_desconto numeric DEFAULT 0)
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
    v_valor_original, p_forma_pagamento, p_conta_bancaria_id, p_observacoes,
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

REVOKE ALL ON FUNCTION public.financeiro_liquidar_titulo(uuid, text, numeric, date, text, uuid, uuid, text, jsonb, uuid, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.financeiro_liquidar_titulo(uuid, text, numeric, date, text, uuid, uuid, text, jsonb, uuid, numeric, numeric, numeric) TO authenticated, service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.exigir_nao_retroativo(text,timestamptz,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.trg_bloquear_lancamento_retroativo()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.exigir_nao_retroativo(text,timestamptz,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PERM1_RETROATIVO_ACL_INVALIDA';
  END IF;
  IF (SELECT public.pascoa(2026)) <> '2026-04-05'::date THEN
    RAISE EXCEPTION 'PASCOA_CALCULO_INVALIDO';
  END IF;
END;
$$;
