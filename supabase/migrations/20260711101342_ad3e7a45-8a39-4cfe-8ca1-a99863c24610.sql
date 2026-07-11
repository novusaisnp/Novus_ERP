
-- ============================================================
-- FIN-E1: Base estrutural pagamentos
-- ============================================================

-- 1) modalidades_pagamento (catálogo global)
CREATE TABLE IF NOT EXISTS public.modalidades_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  exige_adquirente boolean NOT NULL DEFAULT false,
  permite_parcelamento boolean NOT NULL DEFAULT false,
  liquidacao_imediata boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT ON public.modalidades_pagamento TO authenticated;
GRANT ALL ON public.modalidades_pagamento TO service_role;

ALTER TABLE public.modalidades_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modalidades_pagamento_select"
  ON public.modalidades_pagamento FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "modalidades_pagamento_admin_insert"
  ON public.modalidades_pagamento FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "modalidades_pagamento_admin_update"
  ON public.modalidades_pagamento FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "modalidades_pagamento_admin_delete"
  ON public.modalidades_pagamento FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_modalidades_pagamento_ativo
  ON public.modalidades_pagamento (ativo) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_modalidades_pagamento_updated_at
  BEFORE UPDATE ON public.modalidades_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) naturezas_pagamento (catálogo global)
CREATE TABLE IF NOT EXISTS public.naturezas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT ON public.naturezas_pagamento TO authenticated;
GRANT ALL ON public.naturezas_pagamento TO service_role;

ALTER TABLE public.naturezas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "naturezas_pagamento_select"
  ON public.naturezas_pagamento FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "naturezas_pagamento_admin_insert"
  ON public.naturezas_pagamento FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "naturezas_pagamento_admin_update"
  ON public.naturezas_pagamento FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "naturezas_pagamento_admin_delete"
  ON public.naturezas_pagamento FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_naturezas_pagamento_ativo
  ON public.naturezas_pagamento (ativo) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_naturezas_pagamento_updated_at
  BEFORE UPDATE ON public.naturezas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) Extensão de planos_pagamento
ALTER TABLE public.planos_pagamento
  ADD COLUMN IF NOT EXISTS natureza_id uuid REFERENCES public.naturezas_pagamento(id),
  ADD COLUMN IF NOT EXISTS modalidade_default_id uuid REFERENCES public.modalidades_pagamento(id),
  ADD COLUMN IF NOT EXISTS qtd_parcelas integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS dias_primeira_parcela integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_entrada numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS juros_am numeric(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa_perc numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_avista_perc numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tolerancia_arredondamento numeric(5,2) NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vigencia_inicio date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS vigencia_fim date,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Checks de faixa (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planos_pagamento_percentuais_check') THEN
    ALTER TABLE public.planos_pagamento
      ADD CONSTRAINT planos_pagamento_percentuais_check
      CHECK (
        percentual_entrada BETWEEN 0 AND 100
        AND multa_perc BETWEEN 0 AND 100
        AND desconto_avista_perc BETWEEN 0 AND 100
        AND juros_am >= 0
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planos_pagamento_parcelas_check') THEN
    ALTER TABLE public.planos_pagamento
      ADD CONSTRAINT planos_pagamento_parcelas_check
      CHECK (qtd_parcelas >= 1 AND intervalo_dias >= 0 AND dias_primeira_parcela >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planos_pagamento_empresa_nome_unique') THEN
    ALTER TABLE public.planos_pagamento
      ADD CONSTRAINT planos_pagamento_empresa_nome_unique UNIQUE (empresa_representada_id, nome);
  END IF;
END $$;

-- Sincroniza qtd_parcelas com o valor legado numero_parcelas quando existir
UPDATE public.planos_pagamento
   SET qtd_parcelas = numero_parcelas
 WHERE qtd_parcelas IS DISTINCT FROM numero_parcelas
   AND numero_parcelas IS NOT NULL;


-- 4) Seeds — catálogos globais (idempotentes)
INSERT INTO public.modalidades_pagamento (codigo, nome, exige_adquirente, permite_parcelamento, liquidacao_imediata, ordem) VALUES
  ('PIX',           'PIX',              false, false, true,  10),
  ('DINHEIRO',      'Dinheiro',         false, false, true,  20),
  ('CARTAO_DEBITO', 'Cartão de Débito', true,  false, true,  30),
  ('CARTAO_CREDITO','Cartão de Crédito',true,  true,  false, 40),
  ('BOLETO',        'Boleto',           false, true,  false, 50),
  ('TRANSFERENCIA', 'Transferência',    false, false, true,  60),
  ('CREDIARIO',     'Crediário',        false, true,  false, 70)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.naturezas_pagamento (codigo, nome, ordem) VALUES
  ('AVISTA',            'À vista',          10),
  ('PARCELADO',         'Parcelado',        20),
  ('CREDIARIO_PROPRIO', 'Crediário próprio',30),
  ('RECORRENTE',        'Recorrente',       40)
ON CONFLICT (codigo) DO NOTHING;


-- 5) Seeds de planos por empresa (idempotentes)
DO $$
DECLARE
  emp record;
  n_avista uuid; n_parcel uuid; n_cred uuid;
  m_credito uuid; m_boleto uuid; m_crediario uuid; m_pix uuid;
BEGIN
  SELECT id INTO n_avista FROM public.naturezas_pagamento WHERE codigo = 'AVISTA';
  SELECT id INTO n_parcel FROM public.naturezas_pagamento WHERE codigo = 'PARCELADO';
  SELECT id INTO n_cred   FROM public.naturezas_pagamento WHERE codigo = 'CREDIARIO_PROPRIO';

  SELECT id INTO m_credito   FROM public.modalidades_pagamento WHERE codigo = 'CARTAO_CREDITO';
  SELECT id INTO m_boleto    FROM public.modalidades_pagamento WHERE codigo = 'BOLETO';
  SELECT id INTO m_crediario FROM public.modalidades_pagamento WHERE codigo = 'CREDIARIO';
  SELECT id INTO m_pix       FROM public.modalidades_pagamento WHERE codigo = 'PIX';

  FOR emp IN SELECT id FROM public.empresas_representadas LOOP
    INSERT INTO public.planos_pagamento
      (empresa_representada_id, nome, descricao, numero_parcelas, intervalo_dias,
       natureza_id, modalidade_default_id, qtd_parcelas, dias_primeira_parcela,
       percentual_entrada, juros_am, desconto_avista_perc)
    VALUES
      (emp.id, 'À vista',                 'Pagamento à vista',                   1, 0,  n_avista, m_pix,       1, 0,  0, 0, 0),
      (emp.id, '2x sem juros',            'Cartão em 2x sem juros',              2, 30, n_parcel, m_credito,   2, 30, 0, 0, 0),
      (emp.id, '3x sem juros',            'Cartão em 3x sem juros',              3, 30, n_parcel, m_credito,   3, 30, 0, 0, 0),
      (emp.id, '6x sem juros',            'Cartão em 6x sem juros',              6, 30, n_parcel, m_credito,   6, 30, 0, 0, 0),
      (emp.id, '10x sem juros',           'Cartão em 10x sem juros',            10, 30, n_parcel, m_credito,  10, 30, 0, 0, 0),
      (emp.id, '12x sem juros',           'Cartão em 12x sem juros',            12, 30, n_parcel, m_credito,  12, 30, 0, 0, 0),
      (emp.id, '12x com juros 1,99% a.m.','Cartão em 12x com juros de 1,99% a.m.',12,30,n_parcel, m_credito,  12, 30, 0, 1.99, 0),
      (emp.id, 'Entrada 30% + 3x',        'Entrada de 30% + 3 parcelas de 30 dias',3,30,n_parcel, m_boleto,    3, 30, 30, 0, 0),
      (emp.id, 'Crediário 30',            'Crediário próprio 1x em 30 dias',     1, 30, n_cred,   m_crediario, 1, 30, 0, 0, 0),
      (emp.id, 'Crediário 30-60',         'Crediário próprio em 2x (30/60 dias)',2, 30, n_cred,   m_crediario, 2, 30, 0, 0, 0),
      (emp.id, 'Crediário 30-60-90',      'Crediário próprio em 3x (30/60/90 dias)',3,30,n_cred,  m_crediario, 3, 30, 0, 0, 0)
    ON CONFLICT (empresa_representada_id, nome) DO NOTHING;
  END LOOP;
END $$;
