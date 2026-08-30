-- ATV-1: cadastro de bem, motor de depreciação e baixa com ganho/perda.
-- Onda 1 do Mapa Mestre de Capacidades (docs/PLANO_MESTRE.md, Parte 3).
-- Sequenciado antes da parte 2 do FIN-4 porque EBITDA depende da depreciação existir.
--
-- Fora de escopo desta passada (gaps conhecidos, registrados em docs/STATUS.md):
-- vínculo automático com COMP- (compra de imobilizado gera o ativo) — COMP- não existe
-- ainda, então a aquisição aqui é tratada como compra à vista (Débito Imobilizado /
-- Crédito Caixa e Bancos); quando COMP- existir, isso passa a nascer de um pedido de
-- compra e credita Contas a Pagar, não Caixa direto. Agendamento automático mensal via
-- pg_cron não incluído — é mudança de configuração persistente, fica pra quando o
-- usuário confirmar explicitamente; por ora o processamento é sob demanda (RPC).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Novas contas no plano mínimo (estende o seed do FIN-4, não recria)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seed_plano_contas_ativo_fixo(p_empresa_id uuid)
RETURNS TABLE(
  imobilizado_id uuid,
  depreciacao_acumulada_id uuid,
  despesa_depreciacao_id uuid,
  resultado_baixa_id uuid
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ativo_nao_circulante_id uuid;
  v_despesas_operacionais_id uuid;
  v_imobilizado_id uuid;
  v_depreciacao_acumulada_id uuid;
  v_despesa_depreciacao_id uuid;
  v_resultado_baixa_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.2.1') THEN
    SELECT id INTO v_imobilizado_id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.2.1';
    SELECT id INTO v_depreciacao_acumulada_id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.2.2';
    SELECT id INTO v_despesa_depreciacao_id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '2.2.1';
    SELECT id INTO v_resultado_baixa_id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '2.2.2';
    imobilizado_id := v_imobilizado_id;
    depreciacao_acumulada_id := v_depreciacao_acumulada_id;
    despesa_depreciacao_id := v_despesa_depreciacao_id;
    resultado_baixa_id := v_resultado_baixa_id;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id INTO v_ativo_nao_circulante_id FROM public.plano_contas
    WHERE empresa_representada_id = p_empresa_id AND codigo = '3';
  SELECT id INTO v_despesas_operacionais_id FROM public.plano_contas
    WHERE empresa_representada_id = p_empresa_id AND codigo = '2.2';

  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.2', 'Ativo Não Circulante', 'ATIVO', 2, v_ativo_nao_circulante_id, false);
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.2.1', 'Imobilizado', 'ATIVO', 3,
      (SELECT id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.2'), true)
    RETURNING id INTO v_imobilizado_id;
  -- Depreciação Acumulada é contra-ativo: fica sob ATIVO pra aparecer junto do
  -- Imobilizado no Balanço, mas natureza CREDORA (reduz o ativo) — passada explícita
  -- pro trigger de derivação não sobrescrever com o padrão de ATIVO=DEVEDORA.
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, natureza, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.2.2', 'Depreciação Acumulada', 'ATIVO', 'CREDORA', 3,
      (SELECT id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.2'), true)
    RETURNING id INTO v_depreciacao_acumulada_id;

  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '2.2.1', 'Depreciação e Amortização', 'DESPESA', 3, v_despesas_operacionais_id, true)
    RETURNING id INTO v_despesa_depreciacao_id;
  -- Resultado na baixa de imobilizado: uma conta só (DESPESA), recebe débito quando dá
  -- perda e crédito quando dá ganho — simplificação deliberada pra não precisar de uma
  -- conta de RECEITA irmã só pra esse caso raro (registrado em docs/STATUS.md).
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '2.2.2', 'Resultado na Baixa de Imobilizado', 'DESPESA', 3, v_despesas_operacionais_id, true)
    RETURNING id INTO v_resultado_baixa_id;

  imobilizado_id := v_imobilizado_id;
  depreciacao_acumulada_id := v_depreciacao_acumulada_id;
  despesa_depreciacao_id := v_despesa_depreciacao_id;
  resultado_baixa_id := v_resultado_baixa_id;
  RETURN NEXT;
END;
$$;

ALTER TABLE public.empresas_representadas
  ADD COLUMN plano_conta_imobilizado_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN plano_conta_depreciacao_acumulada_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN plano_conta_despesa_depreciacao_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN plano_conta_resultado_baixa_ativo_default_id uuid REFERENCES public.plano_contas(id);

DO $$
DECLARE
  v_empresa record;
  v_seed record;
BEGIN
  FOR v_empresa IN SELECT id FROM public.empresas_representadas LOOP
    SELECT * INTO v_seed FROM public.seed_plano_contas_ativo_fixo(v_empresa.id);
    UPDATE public.empresas_representadas
    SET plano_conta_imobilizado_default_id = v_seed.imobilizado_id,
        plano_conta_depreciacao_acumulada_default_id = v_seed.depreciacao_acumulada_id,
        plano_conta_despesa_depreciacao_default_id = v_seed.despesa_depreciacao_id,
        plano_conta_resultado_baixa_ativo_default_id = v_seed.resultado_baixa_id
    WHERE id = v_empresa.id;
  END LOOP;
END $$;

-- Estende (não recria) o trigger de empresa nova do FIN-4 pra semear também as contas
-- de ativo fixo — CREATE OR REPLACE na mesma função já existente.
CREATE OR REPLACE FUNCTION public.seed_plano_contas_nova_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed record;
  v_seed_atv record;
BEGIN
  SELECT * INTO v_seed FROM public.seed_plano_contas_minimo(NEW.id);
  SELECT * INTO v_seed_atv FROM public.seed_plano_contas_ativo_fixo(NEW.id);
  UPDATE public.empresas_representadas
  SET plano_conta_caixa_bancos_default_id = v_seed.caixa_bancos_id,
      plano_conta_contas_receber_default_id = v_seed.contas_receber_id,
      plano_conta_contas_pagar_default_id = v_seed.contas_pagar_id,
      plano_conta_imobilizado_default_id = v_seed_atv.imobilizado_id,
      plano_conta_depreciacao_acumulada_default_id = v_seed_atv.depreciacao_acumulada_id,
      plano_conta_despesa_depreciacao_default_id = v_seed_atv.despesa_depreciacao_id,
      plano_conta_resultado_baixa_ativo_default_id = v_seed_atv.resultado_baixa_id
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_plano_contas_ativo_fixo(uuid) FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Cadastro de bem
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.ativos_fixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome varchar NOT NULL,
  descricao text,
  categoria varchar,
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  data_aquisicao date NOT NULL,
  valor_aquisicao numeric(14, 2) NOT NULL CHECK (valor_aquisicao > 0),
  valor_residual numeric(14, 2) NOT NULL DEFAULT 0 CHECK (valor_residual >= 0),
  vida_util_meses integer NOT NULL CHECK (vida_util_meses > 0),
  valor_depreciado_acumulado numeric(14, 2) NOT NULL DEFAULT 0,
  ultima_competencia_depreciada date,
  status varchar NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'BAIXADO')),
  data_baixa date,
  valor_baixa numeric(14, 2),
  motivo_baixa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valor_residual <= valor_aquisicao)
);

CREATE INDEX ativos_fixos_empresa_idx ON public.ativos_fixos (empresa_representada_id);
CREATE INDEX ativos_fixos_status_idx ON public.ativos_fixos (empresa_representada_id, status);

CREATE TRIGGER trg_ativos_fixos_updated_at
  BEFORE UPDATE ON public.ativos_fixos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ativos_fixos ENABLE ROW LEVEL SECURITY;

-- Mesma sensibilidade de estabelecimentos: leitura ampla (aparece em seletores/relatórios),
-- escrita restrita a admin (impacta Balanço/EBITDA diretamente). Sem policy de DELETE —
-- baixa é o caminho correto, nunca apagar a linha (orfanaria os lançamentos gerados).
CREATE POLICY ativos_fixos_select ON public.ativos_fixos
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY ativos_fixos_insert ON public.ativos_fixos
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY ativos_fixos_update ON public.ativos_fixos
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Aquisição — lançamento automático ao cadastrar o bem
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.lancar_aquisicao_ativo_fixo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta_imobilizado_id uuid;
  v_conta_caixa_id uuid;
  v_lancamento_id uuid;
BEGIN
  SELECT plano_conta_imobilizado_default_id, plano_conta_caixa_bancos_default_id
    INTO v_conta_imobilizado_id, v_conta_caixa_id
  FROM public.empresas_representadas WHERE id = NEW.empresa_representada_id;

  IF v_conta_imobilizado_id IS NULL OR v_conta_caixa_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lancamentos_contabeis (
    empresa_representada_id, data_lancamento, data_competencia, historico,
    origem_tipo, origem_tabela, origem_id, idempotency_key
  ) VALUES (
    NEW.empresa_representada_id, NEW.data_aquisicao, NEW.data_aquisicao,
    CONCAT('Aquisição de ativo fixo — ', NEW.nome),
    'MANUAL', 'ativos_fixos', NEW.id, CONCAT(NEW.id::text, '-aquisicao')
  ) RETURNING id INTO v_lancamento_id;

  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
    VALUES (v_lancamento_id, v_conta_imobilizado_id, 'DEBITO', NEW.valor_aquisicao, NEW.centro_custo_id);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
    VALUES (v_lancamento_id, v_conta_caixa_id, 'CREDITO', NEW.valor_aquisicao, NEW.centro_custo_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ativos_fixos_lancar_aquisicao
  AFTER INSERT ON public.ativos_fixos
  FOR EACH ROW EXECUTE FUNCTION public.lancar_aquisicao_ativo_fixo();

REVOKE EXECUTE ON FUNCTION public.lancar_aquisicao_ativo_fixo() FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Motor de depreciação — sob demanda (RPC), sem agendamento automático ainda
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.processar_depreciacao_mensal(p_empresa_id uuid, p_competencia date DEFAULT date_trunc('month', CURRENT_DATE)::date)
RETURNS TABLE(ativo_id uuid, valor_depreciado numeric, lancamento_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competencia date := date_trunc('month', p_competencia)::date;
  v_conta_despesa_id uuid;
  v_conta_dep_acumulada_id uuid;
  v_ativo record;
  v_valor_mensal numeric;
  v_saldo_depreciavel numeric;
  v_lancamento_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role_for_empresa(auth.uid(), 'admin', p_empresa_id) THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;

  SELECT plano_conta_despesa_depreciacao_default_id, plano_conta_depreciacao_acumulada_default_id
    INTO v_conta_despesa_id, v_conta_dep_acumulada_id
  FROM public.empresas_representadas WHERE id = p_empresa_id;

  IF v_conta_despesa_id IS NULL OR v_conta_dep_acumulada_id IS NULL THEN
    RAISE EXCEPTION 'Empresa sem contas de depreciacao configuradas';
  END IF;

  FOR v_ativo IN
    SELECT * FROM public.ativos_fixos
    WHERE empresa_representada_id = p_empresa_id
      AND status = 'ATIVO'
      AND data_aquisicao <= (v_competencia + interval '1 month' - interval '1 day')
      AND (ultima_competencia_depreciada IS NULL OR ultima_competencia_depreciada < v_competencia)
  LOOP
    v_saldo_depreciavel := v_ativo.valor_aquisicao - v_ativo.valor_residual - v_ativo.valor_depreciado_acumulado;
    IF v_saldo_depreciavel <= 0 THEN
      CONTINUE;
    END IF;

    v_valor_mensal := LEAST(
      ROUND((v_ativo.valor_aquisicao - v_ativo.valor_residual) / v_ativo.vida_util_meses, 2),
      v_saldo_depreciavel
    );
    IF v_valor_mensal <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.lancamentos_contabeis (
      empresa_representada_id, data_lancamento, data_competencia, historico,
      origem_tipo, origem_tabela, origem_id, idempotency_key
    ) VALUES (
      p_empresa_id, (v_competencia + interval '1 month' - interval '1 day')::date, v_competencia,
      CONCAT('Depreciação — ', v_ativo.nome, ' (', to_char(v_competencia, 'MM/YYYY'), ')'),
      'MANUAL', 'ativos_fixos', v_ativo.id, CONCAT(v_ativo.id::text, '-dep-', v_competencia::text)
    ) RETURNING id INTO v_lancamento_id;

    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_despesa_id, 'DEBITO', v_valor_mensal, v_ativo.centro_custo_id);
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_dep_acumulada_id, 'CREDITO', v_valor_mensal, v_ativo.centro_custo_id);

    UPDATE public.ativos_fixos
      SET valor_depreciado_acumulado = valor_depreciado_acumulado + v_valor_mensal,
          ultima_competencia_depreciada = v_competencia
      WHERE id = v_ativo.id;

    ativo_id := v_ativo.id;
    valor_depreciado := v_valor_mensal;
    lancamento_id := v_lancamento_id;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.processar_depreciacao_mensal(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_depreciacao_mensal(uuid, date) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Baixa / alienação — ganho ou perda contra o valor contábil líquido
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.baixar_ativo_fixo(p_ativo_id uuid, p_data_baixa date, p_valor_baixa numeric, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ativo record;
  v_valor_contabil numeric;
  v_resultado numeric;
  v_conta_imobilizado_id uuid;
  v_conta_dep_acumulada_id uuid;
  v_conta_caixa_id uuid;
  v_conta_resultado_id uuid;
  v_lancamento_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_valor_baixa IS NULL OR p_valor_baixa < 0 THEN
    RAISE EXCEPTION 'Valor de baixa invalido';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo da baixa e obrigatorio (minimo 5 caracteres)';
  END IF;

  SELECT * INTO v_ativo FROM public.ativos_fixos WHERE id = p_ativo_id FOR UPDATE;
  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'Ativo nao encontrado';
  END IF;
  IF NOT public.has_role_for_empresa(auth.uid(), 'admin', v_ativo.empresa_representada_id) THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF v_ativo.status = 'BAIXADO' THEN
    RAISE EXCEPTION 'Ativo ja baixado';
  END IF;

  SELECT plano_conta_imobilizado_default_id, plano_conta_depreciacao_acumulada_default_id,
         plano_conta_caixa_bancos_default_id, plano_conta_resultado_baixa_ativo_default_id
    INTO v_conta_imobilizado_id, v_conta_dep_acumulada_id, v_conta_caixa_id, v_conta_resultado_id
  FROM public.empresas_representadas WHERE id = v_ativo.empresa_representada_id;

  IF v_conta_imobilizado_id IS NULL OR v_conta_dep_acumulada_id IS NULL
     OR v_conta_caixa_id IS NULL OR v_conta_resultado_id IS NULL THEN
    RAISE EXCEPTION 'Empresa sem contas de ativo fixo configuradas';
  END IF;

  v_valor_contabil := v_ativo.valor_aquisicao - v_ativo.valor_depreciado_acumulado;
  v_resultado := p_valor_baixa - v_valor_contabil;

  UPDATE public.ativos_fixos
    SET status = 'BAIXADO', data_baixa = p_data_baixa, valor_baixa = p_valor_baixa, motivo_baixa = p_motivo
    WHERE id = p_ativo_id;

  INSERT INTO public.lancamentos_contabeis (
    empresa_representada_id, data_lancamento, data_competencia, historico,
    origem_tipo, origem_tabela, origem_id, idempotency_key
  ) VALUES (
    v_ativo.empresa_representada_id, p_data_baixa, p_data_baixa,
    CONCAT('Baixa de ativo fixo — ', v_ativo.nome, ': ', p_motivo),
    'MANUAL', 'ativos_fixos', v_ativo.id, CONCAT(v_ativo.id::text, '-baixa')
  ) RETURNING id INTO v_lancamento_id;

  -- Remove o bem e sua depreciação acumulada dos livros pelo custo histórico.
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
    VALUES (v_lancamento_id, v_conta_dep_acumulada_id, 'DEBITO', v_ativo.valor_depreciado_acumulado, v_ativo.centro_custo_id);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
    VALUES (v_lancamento_id, v_conta_imobilizado_id, 'CREDITO', v_ativo.valor_aquisicao, v_ativo.centro_custo_id);

  -- Entra o valor recebido pela venda (se houver).
  IF p_valor_baixa > 0 THEN
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_caixa_id, 'DEBITO', p_valor_baixa, v_ativo.centro_custo_id);
  END IF;

  -- Plugue de resultado: perda debita, ganho credita a mesma conta (simplificação
  -- documentada — ver cabeçalho desta migration).
  IF v_resultado < 0 THEN
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_resultado_id, 'DEBITO', -v_resultado, v_ativo.centro_custo_id);
  ELSIF v_resultado > 0 THEN
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_resultado_id, 'CREDITO', v_resultado, v_ativo.centro_custo_id);
  END IF;

  RETURN jsonb_build_object(
    'lancamento_id', v_lancamento_id, 'valor_contabil', v_valor_contabil, 'resultado', v_resultado
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.baixar_ativo_fixo(uuid, date, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.baixar_ativo_fixo(uuid, date, numeric, text) TO authenticated;
