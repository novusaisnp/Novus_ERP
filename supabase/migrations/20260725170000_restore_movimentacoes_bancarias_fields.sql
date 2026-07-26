-- Mesmo padrão dos casos anteriores: movimentacoes_bancarias, lotes_movimentacoes e
-- documentos_movimentacoes_bancarias foram redesenhadas em 20260710135935, mas o
-- service real (movimentacoesBancariasService.ts) continua usando o modelo antigo,
-- bem mais rico: transferência entre contas (conta_destino_id), estorno completo
-- (estornado/data_estorno/usuario_estorno_id/motivo_estorno), conciliação
-- (usuario_conciliacao_id), auditoria (usuario_criacao_id/ip_origem) e soft-state
-- (ativo). Sem conta_destino_id, transferências entre contas não têm como funcionar.

ALTER TABLE public.movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS tipo_movimentacao varchar(30),
  ADD COLUMN IF NOT EXISTS data_movimentacao timestamptz,
  ADD COLUMN IF NOT EXISTS documento_referencia varchar(100),
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS conta_destino_id uuid REFERENCES public.contas_bancarias(id),
  ADD COLUMN IF NOT EXISTS usuario_conciliacao_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS estornado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_estorno timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_estorno_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS motivo_estorno text,
  ADD COLUMN IF NOT EXISTS movimentacao_estorno_id uuid REFERENCES public.movimentacoes_bancarias(id),
  ADD COLUMN IF NOT EXISTS usuario_criacao_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ip_origem inet,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_bancarias_conta_destino ON public.movimentacoes_bancarias(conta_destino_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_bancarias_ativo ON public.movimentacoes_bancarias(ativo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_bancarias_estornado ON public.movimentacoes_bancarias(estornado);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_bancarias_data_movimentacao ON public.movimentacoes_bancarias(data_movimentacao);

-- Mantém tipo_movimentacao/data_movimentacao (usadas pelo service) sincronizadas com
-- tipo/data_lancamento (colunas novas, NOT NULL, sem uso hoje no código) para nunca
-- divergir e para que o INSERT do redesenho novo, se algum dia usado, continue válido.
CREATE OR REPLACE FUNCTION public.sync_movimentacoes_bancarias_legacy_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tipo_movimentacao IS NOT NULL THEN
    NEW.tipo := NEW.tipo_movimentacao;
  END IF;
  IF NEW.data_movimentacao IS NOT NULL THEN
    NEW.data_lancamento := NEW.data_movimentacao;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_movimentacoes_bancarias_legacy_fields ON public.movimentacoes_bancarias;
CREATE TRIGGER trg_sync_movimentacoes_bancarias_legacy_fields
  BEFORE INSERT OR UPDATE ON public.movimentacoes_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_movimentacoes_bancarias_legacy_fields();

ALTER TABLE public.lotes_movimentacoes
  ADD COLUMN IF NOT EXISTS numero_lote varchar(50),
  ADD COLUMN IF NOT EXISTS descricao_lote text,
  ADD COLUMN IF NOT EXISTS tipo_lote varchar(30),
  ADD COLUMN IF NOT EXISTS quantidade_movimentacoes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usuario_criacao_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ip_origem inet;

ALTER TABLE public.documentos_movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS nome_original varchar(255),
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS categoria varchar(50),
  ADD COLUMN IF NOT EXISTS usuario_upload_id uuid REFERENCES auth.users(id);
