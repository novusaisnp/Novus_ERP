-- FIN-1 (cauda): Renegociação de título — substitui o SALDO EM ABERTO de um
-- título por novas parcelas, preservando rastreabilidade ao título original.
--
-- Não é cancelamento (que exige zero liquidação ativa) nem estorno (que
-- desfaz uma baixa específica) — é uma terceira operação, permitida mesmo
-- com liquidações parciais já feitas (elas continuam válidas; só o saldo
-- remanescente é substituído).
--
-- Correção contábil deliberada: contas_pagar/contas_receber têm um trigger
-- (`lancar_titulo_criado`) que lança automaticamente Débito/Crédito de
-- reconhecimento em CADA INSERT. As novas parcelas de uma renegociação NÃO
-- são um fato econômico novo — são o mesmo saldo já reconhecido pelo título
-- original, apenas reemitido em novos documentos. Sem uma guarda, cada
-- parcela nova duplicaria a receita/despesa já lançada pelo título original.
-- A guarda usa a nova coluna `renegociado_de_id`: quando presente, o
-- trigger não lança nada. O lançamento de REVERSÃO do título original (ele
-- continua com o lançamento original intacto) segue como gap conhecido, já
-- documentado desde 20260830160000_fin4_livro_contabil_partidas_dobradas.sql
-- para cancelamento — esta migration não piora esse gap, só evita criar um
-- NOVO bug de dupla contagem em cima dele.

ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS renegociado_de_id uuid REFERENCES public.contas_pagar(id),
  ADD COLUMN IF NOT EXISTS renegociacao_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS motivo_renegociacao text,
  ADD COLUMN IF NOT EXISTS data_renegociacao timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_renegociacao_id uuid;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS renegociado_de_id uuid REFERENCES public.contas_receber(id),
  ADD COLUMN IF NOT EXISTS renegociacao_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS motivo_renegociacao text,
  ADD COLUMN IF NOT EXISTS data_renegociacao timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_renegociacao_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_pagar_renegociacao_idempotency
  ON public.contas_pagar (empresa_representada_id, renegociacao_idempotency_key)
  WHERE renegociacao_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_receber_renegociacao_idempotency
  ON public.contas_receber (empresa_representada_id, renegociacao_idempotency_key)
  WHERE renegociacao_idempotency_key IS NOT NULL;

ALTER TABLE public.contas_pagar DROP CONSTRAINT contas_pagar_status_check;
ALTER TABLE public.contas_pagar ADD CONSTRAINT contas_pagar_status_check
  CHECK (((status)::text = ANY ((ARRAY['PENDENTE','PAGO','PARCIAL','VENCIDO','CANCELADO','RENEGOCIADO']::character varying[])::text[])));

ALTER TABLE public.contas_receber DROP CONSTRAINT contas_receber_status_check;
ALTER TABLE public.contas_receber ADD CONSTRAINT contas_receber_status_check
  CHECK (((status)::text = ANY ((ARRAY['PENDENTE','RECEBIDO','PARCIAL','VENCIDO','CANCELADO','RENEGOCIADO']::character varying[])::text[])));

-- Guarda contra dupla contagem contábil (ver comentário no topo do arquivo).
-- CREATE OR REPLACE com a MESMA assinatura (função de trigger, sem parâmetros
-- de entrada) — substitui de verdade, não cria sobrecarga (ao contrário do
-- incidente de 20260907250000, corrigido em 20260907260000).
CREATE OR REPLACE FUNCTION public.lancar_titulo_criado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_conta_titulo_id uuid;
  v_lancamento_id uuid;
  v_origem_tipo varchar;
  v_rateio record;
  v_tem_rateio boolean := false;
  v_conta_contrapartida uuid;
  v_cc_contrapartida uuid;
BEGIN
  -- Titulo nascido de renegociacao (financeiro_renegociar_titulo) nao e fato economico
  -- novo -- e o mesmo saldo do titulo original reemitido em novas parcelas. O titulo
  -- original ja gerou o lancamento de reconhecimento; lancar de novo aqui duplicaria
  -- receita/despesa.
  IF NEW.renegociado_de_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'contas_receber' THEN
    v_origem_tipo := 'TITULO_RECEBER';
    SELECT plano_conta_contas_receber_default_id INTO v_conta_titulo_id
    FROM public.empresas_representadas WHERE id = NEW.empresa_representada_id;
  ELSE
    v_origem_tipo := 'TITULO_PAGAR';
    SELECT plano_conta_contas_pagar_default_id INTO v_conta_titulo_id
    FROM public.empresas_representadas WHERE id = NEW.empresa_representada_id;
  END IF;

  IF v_conta_titulo_id IS NULL THEN
    -- Empresa sem plano de contas configurado ainda (ex.: seed rodou antes do trigger
    -- existir) — não bloqueia a operação financeira, só não contabiliza. Documentado
    -- como gap conhecido em docs/STATUS.md.
    RETURN NEW;
  END IF;

  INSERT INTO public.lancamentos_contabeis (
    empresa_representada_id, data_lancamento, data_competencia, historico,
    origem_tipo, origem_tabela, origem_id, idempotency_key
  ) VALUES (
    NEW.empresa_representada_id, CURRENT_DATE, COALESCE(NEW.data_emissao, CURRENT_DATE),
    CONCAT('Reconhecimento — ', NEW.descricao),
    v_origem_tipo, TG_TABLE_NAME, NEW.id, NEW.id::text
  ) RETURNING id INTO v_lancamento_id;

  IF TG_TABLE_NAME = 'contas_receber' THEN
    FOR v_rateio IN SELECT plano_conta_id, centro_custo_id, valor FROM public.rateios_contas_receber WHERE conta_receber_id = NEW.id LOOP
      v_tem_rateio := true;
      INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
        VALUES (v_lancamento_id, v_rateio.plano_conta_id, 'CREDITO', v_rateio.valor, v_rateio.centro_custo_id);
    END LOOP;
    IF NOT v_tem_rateio THEN
      v_conta_contrapartida := NEW.plano_conta_id;
      v_cc_contrapartida := NEW.centro_custo_id;
      IF v_conta_contrapartida IS NULL THEN RETURN NEW; END IF;
      INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
        VALUES (v_lancamento_id, v_conta_contrapartida, 'CREDITO', NEW.valor_original, v_cc_contrapartida);
    END IF;
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor)
      VALUES (v_lancamento_id, v_conta_titulo_id, 'DEBITO', NEW.valor_original);
  ELSE
    FOR v_rateio IN SELECT plano_conta_id, centro_custo_id, valor FROM public.rateios_contas_pagar WHERE conta_pagar_id = NEW.id LOOP
      v_tem_rateio := true;
      INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
        VALUES (v_lancamento_id, v_rateio.plano_conta_id, 'DEBITO', v_rateio.valor, v_rateio.centro_custo_id);
    END LOOP;
    IF NOT v_tem_rateio THEN
      v_conta_contrapartida := NEW.plano_conta_id;
      v_cc_contrapartida := NEW.centro_custo_id;
      IF v_conta_contrapartida IS NULL THEN RETURN NEW; END IF;
      INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
        VALUES (v_lancamento_id, v_conta_contrapartida, 'DEBITO', NEW.valor_original, v_cc_contrapartida);
    END IF;
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor)
      VALUES (v_lancamento_id, v_conta_titulo_id, 'CREDITO', NEW.valor_original);
  END IF;

  RETURN NEW;
END;
$function$;

-- CREATE OR REPLACE aqui é seguro: mesma assinatura (0 parâmetros), só acrescenta uma
-- chave no jsonb retornado.
CREATE OR REPLACE FUNCTION public.financeiro_permissoes()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'pode_liquidar', financeiro_pode('financeiro.liquidar'),
    'pode_estornar', financeiro_pode('financeiro.estorno'),
    'pode_editar', financeiro_pode('financeiro.update'),
    'pode_cancelar', financeiro_pode('financeiro.cancelamento'),
    'pode_visualizar_historico', financeiro_pode('financeiro.read'),
    'pode_editar_rateio', financeiro_pode('financeiro.update'),
    'pode_renegociar', financeiro_pode('financeiro.renegociacao')
  );
$function$;

-- Função nova (não é append em cima de uma existente — sem risco de sobrecarga
-- fantasma). ACL travado explicitamente logo abaixo, nunca confiar no default do
-- schema (foi exatamente isso que causou o incidente de 20260907250000/260000).
CREATE FUNCTION public.financeiro_renegociar_titulo(
  p_titulo_id uuid,
  p_tipo_titulo text,
  p_motivo text,
  p_idempotency_key uuid,
  p_novas_parcelas jsonb,
  p_ticket_autorizacao uuid DEFAULT NULL::uuid
)
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
     AND NOT public.has_role(auth.uid(), 'admin') THEN
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

REVOKE ALL ON FUNCTION public.financeiro_renegociar_titulo(
  uuid, text, text, uuid, jsonb, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.financeiro_renegociar_titulo(
  uuid, text, text, uuid, jsonb, uuid
) TO authenticated, service_role;

DO $$
DECLARE
  v_acl aclitem[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contas_pagar' AND column_name = 'renegociado_de_id'
  ) THEN
    RAISE EXCEPTION 'contas_pagar.renegociado_de_id nao foi criada';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contas_receber_status_check'
      AND pg_get_constraintdef(oid) LIKE '%RENEGOCIADO%'
  ) THEN
    RAISE EXCEPTION 'contas_receber_status_check nao inclui RENEGOCIADO';
  END IF;
  IF (SELECT count(*) FROM pg_proc WHERE proname = 'financeiro_renegociar_titulo') <> 1 THEN
    RAISE EXCEPTION 'financeiro_renegociar_titulo deveria ter exatamente 1 sobrecarga';
  END IF;
  SELECT proacl INTO v_acl FROM pg_proc WHERE proname = 'financeiro_renegociar_titulo';
  IF EXISTS (SELECT 1 FROM unnest(v_acl) a WHERE a::text LIKE '=X%' OR a::text LIKE 'anon=%') THEN
    RAISE EXCEPTION 'financeiro_renegociar_titulo com EXECUTE indevido para PUBLIC/anon';
  END IF;
END $$;
