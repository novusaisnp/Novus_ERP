-- Mesma decisao ja tomada para liquidacoes_titulos (arquivo movimentacoesService.ts,
-- mesma feature): historico_movimentacoes_financeiras virou um log de auditoria
-- generico (acao/registro_id/tabela_origem) e documentos_titulos_financeiros passou
-- a usar conta_pagar_id/conta_receber_id separados - mas o codigo real ainda usa o
-- formato antigo (titulo_id/tipo_titulo/tipo_operacao/ativo). Restaura as colunas
-- antigas ao lado das novas, sem remover nada.

ALTER TABLE public.historico_movimentacoes_financeiras
  ADD COLUMN IF NOT EXISTS titulo_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_titulo varchar(20),
  ADD COLUMN IF NOT EXISTS tipo_operacao varchar(20),
  ADD COLUMN IF NOT EXISTS valor_movimentado numeric(15,2),
  ADD COLUMN IF NOT EXISTS data_operacao timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS usuario_nome text,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE INDEX IF NOT EXISTS idx_historico_mov_financeiras_titulo_id ON public.historico_movimentacoes_financeiras(titulo_id);

ALTER TABLE public.documentos_titulos_financeiros
  ADD COLUMN IF NOT EXISTS titulo_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_titulo varchar(20),
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nome_original varchar(255),
  ADD COLUMN IF NOT EXISTS categoria varchar(50),
  ADD COLUMN IF NOT EXISTS upload_usuario_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_documentos_titulos_titulo_id ON public.documentos_titulos_financeiros(titulo_id);
