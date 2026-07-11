
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS data_competencia DATE,
  ADD COLUMN IF NOT EXISTS recorrente BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS periodicidade TEXT;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS data_competencia DATE,
  ADD COLUMN IF NOT EXISTS recorrente BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS periodicidade TEXT;

ALTER TABLE public.contas_pagar
  DROP CONSTRAINT IF EXISTS contas_pagar_periodicidade_check,
  ADD CONSTRAINT contas_pagar_periodicidade_check
    CHECK (periodicidade IS NULL OR periodicidade IN ('MENSAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL'));

ALTER TABLE public.contas_receber
  DROP CONSTRAINT IF EXISTS contas_receber_periodicidade_check,
  ADD CONSTRAINT contas_receber_periodicidade_check
    CHECK (periodicidade IS NULL OR periodicidade IN ('MENSAL','BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL'));

CREATE INDEX IF NOT EXISTS idx_contas_pagar_data_competencia
  ON public.contas_pagar (data_competencia) WHERE data_competencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contas_pagar_recorrente
  ON public.contas_pagar (recorrente, periodicidade) WHERE recorrente = true;

CREATE INDEX IF NOT EXISTS idx_contas_receber_data_competencia
  ON public.contas_receber (data_competencia) WHERE data_competencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contas_receber_recorrente
  ON public.contas_receber (recorrente, periodicidade) WHERE recorrente = true;
