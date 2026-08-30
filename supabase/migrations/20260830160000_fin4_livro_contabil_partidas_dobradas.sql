-- FIN-4 (parte 1): livro contábil imutável de partidas dobradas — fundação do núcleo,
-- Onda 1 do Mapa Mestre de Capacidades (docs/PLANO_MESTRE.md, Parte 3).
--
-- Escopo desta migration: schema do livro (cabeçalho + linhas), período contábil, seed de
-- um plano mínimo ATIVO/PASSIVO/PATRIMÔNIO (5 contas universais — decisão do usuário
-- 2026-08-30, pra poder testar o motor de ponta a ponta antes da validação completa do
-- contador), e os 3 gatilhos que fecham o ciclo mais crítico: título criado → lançamento
-- de reconhecimento (regime de competência); liquidação → lançamento de caixa; estorno de
-- liquidação → lançamento de reversão.
--
-- Fora de escopo desta passada (gaps conhecidos, registrados em docs/STATUS.md, não
-- silenciosos): cancelamento/renegociação de título ainda não gera lançamento de reversão
-- (o próprio fluxo de cancelamento no FIN-1 ainda está "aguardando validação"); edição de
-- valor de um título já lançado não retificação automática; juros/multa/desconto da
-- liquidação não geram linha própria ainda (só o valor_pago líquido move Caixa↔Título).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. plano_contas: natureza (DEVEDORA/CREDORA) passa a ser derivada do tipo,
--    nunca mais digitada à mão — é axioma contábil, não decisão do usuário.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.plano_contas
SET natureza = CASE
  WHEN tipo IN ('ATIVO', 'DESPESA') THEN 'DEVEDORA'
  WHEN tipo IN ('PASSIVO', 'PATRIMONIO', 'RECEITA') THEN 'CREDORA'
END
WHERE natureza IS NULL;

CREATE OR REPLACE FUNCTION public.derivar_natureza_plano_conta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.natureza IS NULL THEN
    NEW.natureza := CASE
      WHEN NEW.tipo IN ('ATIVO', 'DESPESA') THEN 'DEVEDORA'
      WHEN NEW.tipo IN ('PASSIVO', 'PATRIMONIO', 'RECEITA') THEN 'CREDORA'
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_plano_contas_derivar_natureza
  BEFORE INSERT OR UPDATE ON public.plano_contas
  FOR EACH ROW EXECUTE FUNCTION public.derivar_natureza_plano_conta();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Seed do plano mínimo (5 contas-folha + 3 sintéticas) — bootstrap universal,
--    sem juízo de valor contábil específico do negócio (decisão do contador vem depois,
--    expande/reclassifica sem quebrar nada, são só registros).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seed_plano_contas_minimo(p_empresa_id uuid)
RETURNS TABLE(caixa_bancos_id uuid, contas_receber_id uuid, contas_pagar_id uuid)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ativo_id uuid;
  v_ativo_circulante_id uuid;
  v_passivo_id uuid;
  v_passivo_circulante_id uuid;
  v_patrimonio_id uuid;
  v_caixa_bancos_id uuid;
  v_contas_receber_id uuid;
  v_contas_pagar_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND tipo = 'ATIVO') THEN
    RETURN;
  END IF;

  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, aceita_lancamento)
    VALUES (p_empresa_id, '3', 'ATIVO', 'ATIVO', 1, false) RETURNING id INTO v_ativo_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.1', 'Ativo Circulante', 'ATIVO', 2, v_ativo_id, false) RETURNING id INTO v_ativo_circulante_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.1.1', 'Caixa e Bancos', 'ATIVO', 3, v_ativo_circulante_id, true) RETURNING id INTO v_caixa_bancos_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.1.2', 'Contas a Receber', 'ATIVO', 3, v_ativo_circulante_id, true) RETURNING id INTO v_contas_receber_id;

  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, aceita_lancamento)
    VALUES (p_empresa_id, '4', 'PASSIVO', 'PASSIVO', 1, false) RETURNING id INTO v_passivo_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '4.1', 'Passivo Circulante', 'PASSIVO', 2, v_passivo_id, false) RETURNING id INTO v_passivo_circulante_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '4.1.1', 'Contas a Pagar', 'PASSIVO', 3, v_passivo_circulante_id, true) RETURNING id INTO v_contas_pagar_id;

  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, aceita_lancamento)
    VALUES (p_empresa_id, '5', 'PATRIMÔNIO LÍQUIDO', 'PATRIMONIO', 1, false) RETURNING id INTO v_patrimonio_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '5.1', 'Capital Social', 'PATRIMONIO', 2, v_patrimonio_id, true);
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '5.2', 'Lucros/Prejuízos Acumulados', 'PATRIMONIO', 2, v_patrimonio_id, true);

  caixa_bancos_id := v_caixa_bancos_id;
  contas_receber_id := v_contas_receber_id;
  contas_pagar_id := v_contas_pagar_id;
  RETURN NEXT;
END;
$$;

ALTER TABLE public.empresas_representadas
  ADD COLUMN plano_conta_caixa_bancos_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN plano_conta_contas_receber_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN plano_conta_contas_pagar_default_id uuid REFERENCES public.plano_contas(id);

DO $$
DECLARE
  v_empresa record;
  v_seed record;
BEGIN
  FOR v_empresa IN SELECT id FROM public.empresas_representadas LOOP
    SELECT * INTO v_seed FROM public.seed_plano_contas_minimo(v_empresa.id);
    IF v_seed.caixa_bancos_id IS NOT NULL THEN
      UPDATE public.empresas_representadas
      SET plano_conta_caixa_bancos_default_id = v_seed.caixa_bancos_id,
          plano_conta_contas_receber_default_id = v_seed.contas_receber_id,
          plano_conta_contas_pagar_default_id = v_seed.contas_pagar_id
      WHERE id = v_empresa.id;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.seed_plano_contas_nova_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed record;
BEGIN
  SELECT * INTO v_seed FROM public.seed_plano_contas_minimo(NEW.id);
  UPDATE public.empresas_representadas
  SET plano_conta_caixa_bancos_default_id = v_seed.caixa_bancos_id,
      plano_conta_contas_receber_default_id = v_seed.contas_receber_id,
      plano_conta_contas_pagar_default_id = v_seed.contas_pagar_id
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresas_representadas_seed_plano_contas
  AFTER INSERT ON public.empresas_representadas
  FOR EACH ROW EXECUTE FUNCTION public.seed_plano_contas_nova_empresa();

REVOKE EXECUTE ON FUNCTION public.seed_plano_contas_nova_empresa() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_plano_contas_minimo(uuid) FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. contas_bancarias ganha subconta contábil própria (opcional — cai no default
--    "Caixa e Bancos" da empresa quando não configurada).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.contas_bancarias
  ADD COLUMN plano_conta_id uuid REFERENCES public.plano_contas(id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Período contábil
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.periodos_contabeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  competencia date NOT NULL,
  status varchar NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO')),
  fechado_em timestamptz,
  fechado_por uuid,
  reaberto_em timestamptz,
  reaberto_por uuid,
  motivo_reabertura text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_representada_id, competencia)
);

CREATE TRIGGER trg_periodos_contabeis_updated_at
  BEFORE UPDATE ON public.periodos_contabeis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.periodos_contabeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY periodos_contabeis_select ON public.periodos_contabeis
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY periodos_contabeis_update ON public.periodos_contabeis
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

-- INSERT só via função (resolve_periodo_contabil, abaixo) e trigger SECURITY DEFINER;
-- não há policy de INSERT direta pra authenticated — evita período fantasma criado por
-- fora do fluxo de lançamento.

CREATE OR REPLACE FUNCTION public.resolver_periodo_contabil(p_empresa_id uuid, p_data date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competencia date := date_trunc('month', p_data)::date;
  v_periodo_id uuid;
BEGIN
  SELECT id INTO v_periodo_id FROM public.periodos_contabeis
  WHERE empresa_representada_id = p_empresa_id AND competencia = v_competencia;

  IF v_periodo_id IS NULL THEN
    INSERT INTO public.periodos_contabeis (empresa_representada_id, competencia, status)
    VALUES (p_empresa_id, v_competencia, 'ABERTO')
    ON CONFLICT (empresa_representada_id, competencia) DO NOTHING
    RETURNING id INTO v_periodo_id;

    IF v_periodo_id IS NULL THEN
      SELECT id INTO v_periodo_id FROM public.periodos_contabeis
      WHERE empresa_representada_id = p_empresa_id AND competencia = v_competencia;
    END IF;
  END IF;

  RETURN v_periodo_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolver_periodo_contabil(uuid, date) FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Livro de lançamentos — cabeçalho + linhas, imutável (sem policy de
--    UPDATE/DELETE: RLS nega por padrão pra quem não é dono/superusuário).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.lancamentos_contabeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  periodo_id uuid NOT NULL REFERENCES public.periodos_contabeis(id),
  numero_lancamento integer NOT NULL,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  data_competencia date NOT NULL,
  historico text NOT NULL,
  origem_tipo varchar NOT NULL CHECK (origem_tipo IN
    ('TITULO_RECEBER', 'TITULO_PAGAR', 'LIQUIDACAO', 'ESTORNO', 'MANUAL', 'ABERTURA')),
  origem_tabela varchar,
  origem_id uuid,
  estorno_de_id uuid REFERENCES public.lancamentos_contabeis(id),
  idempotency_key text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_representada_id, numero_lancamento)
);

CREATE UNIQUE INDEX lancamentos_contabeis_idempotency_idx
  ON public.lancamentos_contabeis (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX lancamentos_contabeis_origem_idx
  ON public.lancamentos_contabeis (origem_tabela, origem_id);

CREATE TABLE public.lancamentos_contabeis_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos_contabeis(id),
  conta_contabil_id uuid NOT NULL REFERENCES public.plano_contas(id),
  tipo_partida varchar NOT NULL CHECK (tipo_partida IN ('DEBITO', 'CREDITO')),
  valor numeric(14, 2) NOT NULL CHECK (valor > 0),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  historico_item text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lancamentos_contabeis_itens_lancamento_idx
  ON public.lancamentos_contabeis_itens (lancamento_id);
CREATE INDEX lancamentos_contabeis_itens_conta_idx
  ON public.lancamentos_contabeis_itens (conta_contabil_id);

-- Número sequencial por empresa (contenção sob concorrência é limitação conhecida,
-- aceitável no volume atual — mesmo padrão de trade-off já registrado em outras frentes).
CREATE OR REPLACE FUNCTION public.gerar_numero_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_lancamento IS NULL THEN
    SELECT COALESCE(MAX(numero_lancamento), 0) + 1 INTO NEW.numero_lancamento
    FROM public.lancamentos_contabeis
    WHERE empresa_representada_id = NEW.empresa_representada_id;
  END IF;
  IF NEW.periodo_id IS NULL THEN
    NEW.periodo_id := public.resolver_periodo_contabil(NEW.empresa_representada_id, NEW.data_competencia);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lancamentos_contabeis_numero
  BEFORE INSERT ON public.lancamentos_contabeis
  FOR EACH ROW EXECUTE FUNCTION public.gerar_numero_lancamento();

-- Linha só pode ir pra conta-folha (aceita_lancamento) da mesma empresa do lançamento.
CREATE OR REPLACE FUNCTION public.validar_item_lancamento_contabil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_conta record;
  v_empresa_lancamento uuid;
BEGIN
  SELECT aceita_lancamento, empresa_representada_id INTO v_conta
  FROM public.plano_contas WHERE id = NEW.conta_contabil_id;

  IF NOT v_conta.aceita_lancamento THEN
    RAISE EXCEPTION 'CONTA_NAO_ACEITA_LANCAMENTO: % é conta sintética', NEW.conta_contabil_id USING ERRCODE = 'P0001';
  END IF;

  SELECT empresa_representada_id INTO v_empresa_lancamento
  FROM public.lancamentos_contabeis WHERE id = NEW.lancamento_id;

  IF v_conta.empresa_representada_id <> v_empresa_lancamento THEN
    RAISE EXCEPTION 'CONTA_DE_OUTRA_EMPRESA: % não pertence à empresa do lançamento', NEW.conta_contabil_id USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_item_lancamento_contabil
  BEFORE INSERT ON public.lancamentos_contabeis_itens
  FOR EACH ROW EXECUTE FUNCTION public.validar_item_lancamento_contabil();

-- Débito = Crédito, sempre — deferred pra permitir inserir cabeçalho + N linhas na
-- mesma transação sem se preocupar com ordem.
CREATE OR REPLACE FUNCTION public.validar_balanco_lancamento_contabil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_lancamento_id uuid := COALESCE(NEW.lancamento_id, OLD.lancamento_id);
  v_debito numeric;
  v_credito numeric;
  v_qtd integer;
BEGIN
  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida = 'DEBITO'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida = 'CREDITO'), 0),
    COUNT(*)
  INTO v_debito, v_credito, v_qtd
  FROM public.lancamentos_contabeis_itens
  WHERE lancamento_id = v_lancamento_id;

  IF v_qtd < 2 THEN
    RAISE EXCEPTION 'LANCAMENTO_INCOMPLETO: % precisa de ao menos 1 débito e 1 crédito', v_lancamento_id USING ERRCODE = 'P0001';
  END IF;

  IF v_debito <> v_credito THEN
    RAISE EXCEPTION 'LANCAMENTO_DESBALANCEADO: débito % != crédito % (lançamento %)', v_debito, v_credito, v_lancamento_id USING ERRCODE = 'P0001';
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_validar_balanco_lancamento_contabil
  AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos_contabeis_itens
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validar_balanco_lancamento_contabil();

ALTER TABLE public.lancamentos_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_contabeis_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY lancamentos_contabeis_select ON public.lancamentos_contabeis
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY lancamentos_contabeis_insert ON public.lancamentos_contabeis
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY lancamentos_contabeis_itens_select ON public.lancamentos_contabeis_itens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lancamentos_contabeis lc
      WHERE lc.id = lancamento_id
        AND (
          public.user_has_access_to_empresa(lc.empresa_representada_id)
          OR public.has_role_for_empresa((select auth.uid()), 'admin', lc.empresa_representada_id)
        )
    )
  );

CREATE POLICY lancamentos_contabeis_itens_insert ON public.lancamentos_contabeis_itens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lancamentos_contabeis lc
      WHERE lc.id = lancamento_id
        AND public.has_role_for_empresa((select auth.uid()), 'admin', lc.empresa_representada_id)
    )
  );

-- Nenhuma policy de UPDATE/DELETE em nenhuma das duas tabelas — livro imutável de
-- verdade: correção só por lançamento de estorno novo, nunca reescrita da linha.

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Geração automática — título criado (regime de competência)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.lancar_titulo_criado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta_titulo_id uuid;
  v_lancamento_id uuid;
  v_origem_tipo varchar;
  v_rateio record;
  v_tem_rateio boolean := false;
  v_conta_contrapartida uuid;
  v_cc_contrapartida uuid;
BEGIN
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
$$;

CREATE TRIGGER trg_contas_receber_lancar_criado
  AFTER INSERT ON public.contas_receber
  FOR EACH ROW EXECUTE FUNCTION public.lancar_titulo_criado();

CREATE TRIGGER trg_contas_pagar_lancar_criado
  AFTER INSERT ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.lancar_titulo_criado();

REVOKE EXECUTE ON FUNCTION public.lancar_titulo_criado() FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Geração automática — liquidação (regime de caixa) e estorno de liquidação
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.lancar_liquidacao_titulo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta_caixa_id uuid;
  v_conta_titulo_id uuid;
  v_lancamento_id uuid;
  -- valor_pago é só o principal — o que de fato circula no banco inclui juros/multa e
  -- desconta o desconto (mesma fórmula de financeiro_liquidar_titulo). Simplificação
  -- conhecida: por ora tudo entra numa linha só contra Contas a Receber/Pagar, sem conta
  -- própria de Receita/Despesa Financeira ainda (registrado em docs/STATUS.md).
  v_valor_efetivo numeric;
BEGIN
  IF NEW.estornado THEN
    RETURN NEW;
  END IF;

  v_valor_efetivo := NEW.valor_pago + COALESCE(NEW.valor_juros, 0) + COALESCE(NEW.valor_multa, 0) - COALESCE(NEW.valor_desconto, 0);
  IF v_valor_efetivo <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(cb.plano_conta_id, er.plano_conta_caixa_bancos_default_id)
    INTO v_conta_caixa_id
  FROM public.empresas_representadas er
  LEFT JOIN public.contas_bancarias cb ON cb.id = NEW.conta_bancaria_id
  WHERE er.id = NEW.empresa_representada_id;

  IF NEW.tipo_titulo = 'CONTAS_RECEBER' OR NEW.conta_receber_id IS NOT NULL THEN
    SELECT plano_conta_contas_receber_default_id INTO v_conta_titulo_id
    FROM public.empresas_representadas WHERE id = NEW.empresa_representada_id;
  ELSE
    SELECT plano_conta_contas_pagar_default_id INTO v_conta_titulo_id
    FROM public.empresas_representadas WHERE id = NEW.empresa_representada_id;
  END IF;

  IF v_conta_caixa_id IS NULL OR v_conta_titulo_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lancamentos_contabeis (
    empresa_representada_id, data_lancamento, data_competencia, historico,
    origem_tipo, origem_tabela, origem_id, idempotency_key
  ) VALUES (
    NEW.empresa_representada_id, COALESCE(NEW.data_pagamento, NEW.data_liquidacao, CURRENT_DATE),
    COALESCE(NEW.data_pagamento, NEW.data_liquidacao, CURRENT_DATE),
    CONCAT('Liquidação — ', COALESCE(NEW.historico, NEW.observacoes, 'título')),
    'LIQUIDACAO', 'liquidacoes_titulos', NEW.id, NEW.id::text
  ) RETURNING id INTO v_lancamento_id;

  IF NEW.tipo_titulo = 'CONTAS_RECEBER' OR NEW.conta_receber_id IS NOT NULL THEN
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_caixa_id, 'DEBITO', v_valor_efetivo, NEW.centro_custo_id);
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_titulo_id, 'CREDITO', v_valor_efetivo, NEW.centro_custo_id);
  ELSE
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_titulo_id, 'DEBITO', v_valor_efetivo, NEW.centro_custo_id);
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_caixa_id, 'CREDITO', v_valor_efetivo, NEW.centro_custo_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_liquidacoes_titulos_lancar
  AFTER INSERT ON public.liquidacoes_titulos
  FOR EACH ROW EXECUTE FUNCTION public.lancar_liquidacao_titulo();

REVOKE EXECUTE ON FUNCTION public.lancar_liquidacao_titulo() FROM PUBLIC;

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
BEGIN
  IF NEW.estornado IS DISTINCT FROM true OR OLD.estornado IS TRUE THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_original_id FROM public.lancamentos_contabeis
  WHERE origem_tabela = 'liquidacoes_titulos' AND origem_id = NEW.id;

  IF v_original_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.lancamentos_contabeis (
    empresa_representada_id, data_lancamento, data_competencia, historico,
    origem_tipo, origem_tabela, origem_id, estorno_de_id, idempotency_key
  ) VALUES (
    NEW.empresa_representada_id, CURRENT_DATE, CURRENT_DATE,
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

CREATE TRIGGER trg_liquidacoes_titulos_estorno
  AFTER UPDATE ON public.liquidacoes_titulos
  FOR EACH ROW EXECUTE FUNCTION public.lancar_estorno_liquidacao();

REVOKE EXECUTE ON FUNCTION public.lancar_estorno_liquidacao() FROM PUBLIC;
