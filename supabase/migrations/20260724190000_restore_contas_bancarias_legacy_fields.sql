-- Restaura na tabela contas_bancarias (redesenhada em 20260710135935) campos que a
-- tela de Gestão Bancária > Contas Bancárias ainda usa e que não foram recriados:
-- conta cofre, status com 3 estados (com bloqueio), configurações de alerta/limite,
-- limite de crédito e datas de abertura/encerramento.

ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS conta_cofre boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN IF NOT EXISTS configuracoes jsonb,
  ADD COLUMN IF NOT EXISTS limite_credito numeric(15,2),
  ADD COLUMN IF NOT EXISTS data_abertura date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_encerramento date,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.contas_bancarias
  DROP CONSTRAINT IF EXISTS contas_bancarias_status_chk;
ALTER TABLE public.contas_bancarias
  ADD CONSTRAINT contas_bancarias_status_chk CHECK (status IN ('ATIVA', 'INATIVA', 'BLOQUEADA'));

-- Regra de negócio já validada hoje só no formulário (JS): conta cofre não tem agência,
-- conta normal exige agência. Levar para o banco como rede de segurança.
ALTER TABLE public.contas_bancarias
  DROP CONSTRAINT IF EXISTS contas_bancarias_cofre_ou_agencia_chk;
ALTER TABLE public.contas_bancarias
  ADD CONSTRAINT contas_bancarias_cofre_ou_agencia_chk CHECK (
    (conta_cofre = true AND agencia_id IS NULL) OR
    (conta_cofre = false AND agencia_id IS NOT NULL)
  );

-- Mantém a coluna "ativo" (usada pelo código novo de Gestão Bancária) sincronizada
-- com "status" (usada pela tela de CRUD de contas), para as duas nunca divergirem.
CREATE OR REPLACE FUNCTION public.sync_contas_bancarias_ativo_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ativo := (NEW.status = 'ATIVA');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contas_bancarias_ativo_status ON public.contas_bancarias;
CREATE TRIGGER trg_sync_contas_bancarias_ativo_status
  BEFORE INSERT OR UPDATE OF status ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_contas_bancarias_ativo_status();

-- Backfill: linhas existentes ficam com ativo coerente com o status default.
UPDATE public.contas_bancarias SET ativo = (status = 'ATIVA');

CREATE INDEX IF NOT EXISTS idx_contas_bancarias_status ON public.contas_bancarias(status);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_conta_cofre ON public.contas_bancarias(conta_cofre);
