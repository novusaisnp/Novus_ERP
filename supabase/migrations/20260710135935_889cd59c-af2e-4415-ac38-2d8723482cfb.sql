
-- 1. bancos
CREATE TABLE public.bancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  codigo varchar(10),
  nome varchar(255) NOT NULL,
  nome_curto varchar(50),
  ispb varchar(8),
  site varchar(255),
  logo_url text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bancos TO authenticated;
GRANT ALL ON public.bancos TO service_role;
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bnc_select" ON public.bancos FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bnc_insert" ON public.bancos FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bnc_update" ON public.bancos FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bnc_delete" ON public.bancos FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_bnc_empresa ON public.bancos(empresa_representada_id);
CREATE INDEX idx_bnc_codigo ON public.bancos(codigo);
CREATE INDEX idx_bnc_ativo ON public.bancos(ativo);
CREATE TRIGGER trg_bnc_updated BEFORE UPDATE ON public.bancos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. agencias_bancarias
CREATE TABLE public.agencias_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  banco_id uuid NOT NULL REFERENCES public.bancos(id),
  numero varchar(20) NOT NULL,
  digito varchar(5),
  nome varchar(255),
  telefone varchar(20),
  email varchar(255),
  endereco text,
  ativo boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias_bancarias TO authenticated;
GRANT ALL ON public.agencias_bancarias TO service_role;
ALTER TABLE public.agencias_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ag_select" ON public.agencias_bancarias FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ag_insert" ON public.agencias_bancarias FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ag_update" ON public.agencias_bancarias FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ag_delete" ON public.agencias_bancarias FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_ag_empresa ON public.agencias_bancarias(empresa_representada_id);
CREATE INDEX idx_ag_banco ON public.agencias_bancarias(banco_id);
CREATE INDEX idx_ag_ativo ON public.agencias_bancarias(ativo);
CREATE TRIGGER trg_ag_updated BEFORE UPDATE ON public.agencias_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. contas_bancarias
CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  banco_id uuid REFERENCES public.bancos(id),
  agencia_id uuid REFERENCES public.agencias_bancarias(id),
  numero_conta varchar(30) NOT NULL,
  digito varchar(5),
  tipo_conta varchar(30) CHECK (tipo_conta IN ('CORRENTE','POUPANCA','INVESTIMENTO','CAIXA','OUTRO')),
  nome_titular varchar(255),
  cpf_cnpj_titular varchar(18),
  saldo_inicial numeric(15,2) DEFAULT 0,
  saldo_atual numeric(15,2) DEFAULT 0,
  data_saldo_inicial date,
  limite_cheque_especial numeric(15,2) DEFAULT 0,
  permite_transferencia boolean DEFAULT true,
  principal boolean DEFAULT false,
  descricao text,
  cor varchar(7),
  icone varchar(50),
  ativo boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO authenticated;
GRANT ALL ON public.contas_bancarias TO service_role;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_select" ON public.contas_bancarias FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cb_insert" ON public.contas_bancarias FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cb_update" ON public.contas_bancarias FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cb_delete" ON public.contas_bancarias FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_cb_empresa ON public.contas_bancarias(empresa_representada_id);
CREATE INDEX idx_cb_banco ON public.contas_bancarias(banco_id);
CREATE INDEX idx_cb_agencia ON public.contas_bancarias(agencia_id);
CREATE INDEX idx_cb_ativo ON public.contas_bancarias(ativo);
CREATE INDEX idx_cb_del ON public.contas_bancarias(deleted_at);
CREATE TRIGGER trg_cb_updated BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. lotes_movimentacoes
CREATE TABLE public.lotes_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  tipo varchar(50) NOT NULL,
  status varchar(20) DEFAULT 'ATIVO' CHECK (status IN ('ATIVO','CANCELADO','ESTORNADO')),
  descricao text,
  valor_total numeric(15,2),
  data_lancamento date NOT NULL,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes_movimentacoes TO authenticated;
GRANT ALL ON public.lotes_movimentacoes TO service_role;
ALTER TABLE public.lotes_movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lm_select" ON public.lotes_movimentacoes FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lm_insert" ON public.lotes_movimentacoes FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lm_update" ON public.lotes_movimentacoes FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lm_delete" ON public.lotes_movimentacoes FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_lote_empresa ON public.lotes_movimentacoes(empresa_representada_id);
CREATE INDEX idx_lote_status ON public.lotes_movimentacoes(status);
CREATE INDEX idx_lote_data ON public.lotes_movimentacoes(data_lancamento);
CREATE TRIGGER trg_lote_updated BEFORE UPDATE ON public.lotes_movimentacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. movimentacoes_bancarias
CREATE TABLE public.movimentacoes_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  conta_bancaria_id uuid NOT NULL REFERENCES public.contas_bancarias(id),
  lote_id uuid REFERENCES public.lotes_movimentacoes(id),
  tipo varchar(30) NOT NULL CHECK (tipo IN ('DEPOSITO','SAQUE','TRANSFERENCIA_ENTRADA','TRANSFERENCIA_SAIDA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','PIX_ENTRADA','PIX_SAIDA','TED_ENTRADA','TED_SAIDA','DOC_ENTRADA','DOC_SAIDA','BOLETO','TARIFA','JUROS','OUTROS')),
  valor numeric(15,2) NOT NULL CHECK (valor > 0),
  data_lancamento date NOT NULL,
  data_compensacao date,
  descricao text NOT NULL,
  historico text,
  numero_documento varchar(100),
  beneficiario_pagador varchar(255),
  status varchar(20) DEFAULT 'EFETIVADO' CHECK (status IN ('PENDENTE','EFETIVADO','CANCELADO','ESTORNADO')),
  natureza_id uuid REFERENCES public.natureza_caixas(id),
  plano_conta_id uuid REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  conciliado boolean DEFAULT false,
  data_conciliacao date,
  saldo_anterior numeric(15,2),
  saldo_posterior numeric(15,2),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_bancarias TO authenticated;
GRANT ALL ON public.movimentacoes_bancarias TO service_role;
ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mb_select" ON public.movimentacoes_bancarias FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mb_insert" ON public.movimentacoes_bancarias FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mb_update" ON public.movimentacoes_bancarias FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mb_delete" ON public.movimentacoes_bancarias FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_mb_empresa ON public.movimentacoes_bancarias(empresa_representada_id);
CREATE INDEX idx_mb_conta ON public.movimentacoes_bancarias(conta_bancaria_id);
CREATE INDEX idx_mb_lote ON public.movimentacoes_bancarias(lote_id);
CREATE INDEX idx_mb_tipo ON public.movimentacoes_bancarias(tipo);
CREATE INDEX idx_mb_status ON public.movimentacoes_bancarias(status);
CREATE INDEX idx_mb_data ON public.movimentacoes_bancarias(data_lancamento);
CREATE INDEX idx_mb_conc ON public.movimentacoes_bancarias(conciliado);
CREATE INDEX idx_mb_del ON public.movimentacoes_bancarias(deleted_at);
CREATE TRIGGER trg_mb_updated BEFORE UPDATE ON public.movimentacoes_bancarias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. documentos_movimentacoes_bancarias
CREATE TABLE public.documentos_movimentacoes_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  movimentacao_id uuid NOT NULL REFERENCES public.movimentacoes_bancarias(id) ON DELETE CASCADE,
  nome_arquivo varchar(255) NOT NULL,
  url_arquivo text NOT NULL,
  tipo_arquivo varchar(50),
  tamanho_bytes bigint,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_movimentacoes_bancarias TO authenticated;
GRANT ALL ON public.documentos_movimentacoes_bancarias TO service_role;
ALTER TABLE public.documentos_movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dmb_select" ON public.documentos_movimentacoes_bancarias FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dmb_insert" ON public.documentos_movimentacoes_bancarias FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dmb_update" ON public.documentos_movimentacoes_bancarias FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dmb_delete" ON public.documentos_movimentacoes_bancarias FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_dmb_empresa ON public.documentos_movimentacoes_bancarias(empresa_representada_id);
CREATE INDEX idx_dmb_mov ON public.documentos_movimentacoes_bancarias(movimentacao_id);

-- 7. historico_movimentacoes_bancarias (imutável)
CREATE TABLE public.historico_movimentacoes_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  movimentacao_id uuid REFERENCES public.movimentacoes_bancarias(id),
  conta_bancaria_id uuid REFERENCES public.contas_bancarias(id),
  acao varchar(50) NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  ip_origem inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.historico_movimentacoes_bancarias TO authenticated;
GRANT ALL ON public.historico_movimentacoes_bancarias TO service_role;
ALTER TABLE public.historico_movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hmb_select" ON public.historico_movimentacoes_bancarias FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hmb_insert" ON public.historico_movimentacoes_bancarias FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_hmb_empresa ON public.historico_movimentacoes_bancarias(empresa_representada_id);
CREATE INDEX idx_hmb_mov ON public.historico_movimentacoes_bancarias(movimentacao_id);
CREATE INDEX idx_hmb_conta ON public.historico_movimentacoes_bancarias(conta_bancaria_id);
CREATE INDEX idx_hmb_user ON public.historico_movimentacoes_bancarias(usuario_id);
CREATE INDEX idx_hmb_created ON public.historico_movimentacoes_bancarias(created_at);

-- 8. Função: atualizar_saldo_conta_movimentacao
CREATE OR REPLACE FUNCTION public.atualizar_saldo_conta_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta uuid;
  v_saldo_inicial numeric(15,2);
  v_entradas numeric(15,2);
  v_saidas numeric(15,2);
BEGIN
  v_conta := COALESCE(NEW.conta_bancaria_id, OLD.conta_bancaria_id);

  SELECT COALESCE(saldo_inicial,0) INTO v_saldo_inicial FROM public.contas_bancarias WHERE id = v_conta;

  SELECT COALESCE(SUM(valor),0) INTO v_entradas
  FROM public.movimentacoes_bancarias
  WHERE conta_bancaria_id = v_conta
    AND status = 'EFETIVADO'
    AND deleted_at IS NULL
    AND tipo IN ('DEPOSITO','TRANSFERENCIA_ENTRADA','AJUSTE_POSITIVO','PIX_ENTRADA','TED_ENTRADA','DOC_ENTRADA','JUROS');

  SELECT COALESCE(SUM(valor),0) INTO v_saidas
  FROM public.movimentacoes_bancarias
  WHERE conta_bancaria_id = v_conta
    AND status = 'EFETIVADO'
    AND deleted_at IS NULL
    AND tipo IN ('SAQUE','TRANSFERENCIA_SAIDA','AJUSTE_NEGATIVO','PIX_SAIDA','TED_SAIDA','DOC_SAIDA','BOLETO','TARIFA');

  UPDATE public.contas_bancarias
  SET saldo_atual = v_saldo_inicial + v_entradas - v_saidas
  WHERE id = v_conta;

  RETURN NEW;
END;
$$;

-- 9. Função: registrar_historico_movimentacao
CREATE OR REPLACE FUNCTION public.registrar_historico_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.historico_movimentacoes_bancarias (
    empresa_representada_id, movimentacao_id, conta_bancaria_id,
    acao, dados_anteriores, dados_novos, usuario_id
  ) VALUES (
    COALESCE(NEW.empresa_representada_id, OLD.empresa_representada_id),
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.conta_bancaria_id, OLD.conta_bancaria_id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 10. Função: validar_transferencia_movimentacao
CREATE OR REPLACE FUNCTION public.validar_transferencia_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo numeric(15,2);
BEGIN
  IF NEW.tipo = 'TRANSFERENCIA_SAIDA' THEN
    SELECT COALESCE(saldo_atual,0) INTO v_saldo FROM public.contas_bancarias WHERE id = NEW.conta_bancaria_id;
    IF v_saldo < NEW.valor THEN
      RAISE EXCEPTION 'Saldo insuficiente para transferência';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 11. RPC: transferencia_bancaria_atomica
CREATE OR REPLACE FUNCTION public.transferencia_bancaria_atomica(
  p_empresa_id uuid,
  p_conta_origem_id uuid,
  p_conta_destino_id uuid,
  p_valor numeric,
  p_data_lancamento date,
  p_descricao text,
  p_lote_descricao text,
  p_natureza_id uuid,
  p_plano_conta_id uuid,
  p_centro_custo_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote_id uuid;
BEGIN
  INSERT INTO public.lotes_movimentacoes (empresa_representada_id, tipo, descricao, valor_total, data_lancamento)
  VALUES (p_empresa_id, 'TRANSFERENCIA', p_lote_descricao, p_valor, p_data_lancamento)
  RETURNING id INTO v_lote_id;

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, lote_id, tipo, valor,
    data_lancamento, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_origem_id, v_lote_id, 'TRANSFERENCIA_SAIDA', p_valor,
    p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, lote_id, tipo, valor,
    data_lancamento, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_destino_id, v_lote_id, 'TRANSFERENCIA_ENTRADA', p_valor,
    p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  RETURN v_lote_id;
END;
$$;

-- 12. Função: get_audit_trail
CREATE OR REPLACE FUNCTION public.get_audit_trail(p_movimentacao_id uuid)
RETURNS TABLE (
  id uuid,
  empresa_representada_id uuid,
  movimentacao_id uuid,
  conta_bancaria_id uuid,
  acao varchar,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  ip_origem inet,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT h.id, h.empresa_representada_id, h.movimentacao_id, h.conta_bancaria_id,
         h.acao, h.dados_anteriores, h.dados_novos, h.usuario_id, h.ip_origem, h.created_at
  FROM public.historico_movimentacoes_bancarias h
  WHERE h.movimentacao_id = p_movimentacao_id
  ORDER BY h.created_at DESC;
$$;

-- 13. Triggers
CREATE TRIGGER trigger_validar_transferencia
  BEFORE INSERT ON public.movimentacoes_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.validar_transferencia_movimentacao();

CREATE TRIGGER trigger_atualizar_saldo
  AFTER INSERT OR UPDATE ON public.movimentacoes_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_saldo_conta_movimentacao();

CREATE TRIGGER trigger_registrar_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_movimentacao();
