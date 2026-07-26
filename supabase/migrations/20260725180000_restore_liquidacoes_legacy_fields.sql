-- liquidacoes_titulos/liquidacoes_multiplas foram redesenhadas para o modelo
-- canonico da Porta 2 (docs/CONTRATOS_CANONICOS_ERP.md, definido nesta mesma sessao):
-- conta_pagar_id/conta_receber_id separados em vez de titulo_id+tipo_titulo,
-- cancelada em vez de estornado. Porem LiquidacaoTituloModal.tsx (unico caminho
-- canonico de liquidacao segundo o proprio codigo) e movimentacoesService.ts nunca
-- foram atualizados para o novo formato - continuam usando titulo_id/tipo_titulo/
-- estornado. Mesmo padrao dos outros casos desta sessao: restaura as colunas
-- antigas ao lado das novas, sem remover nada.

ALTER TABLE public.liquidacoes_titulos
  ADD COLUMN IF NOT EXISTS titulo_id uuid,
  ADD COLUMN IF NOT EXISTS tipo_titulo varchar(20),
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS valor_original_titulo numeric(15,2),
  ADD COLUMN IF NOT EXISTS usuario_liquidacao_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS estornado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_estorno timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_estorno text,
  ADD COLUMN IF NOT EXISTS usuario_estorno_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_liquidacoes_titulos_titulo_id ON public.liquidacoes_titulos(titulo_id);
CREATE INDEX IF NOT EXISTS idx_liquidacoes_titulos_estornado ON public.liquidacoes_titulos(estornado);

ALTER TABLE public.liquidacoes_multiplas
  ADD COLUMN IF NOT EXISTS liquidacao_principal_id uuid REFERENCES public.liquidacoes_titulos(id),
  ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid REFERENCES public.contas_bancarias(id),
  ADD COLUMN IF NOT EXISTS valor numeric(15,2);

CREATE INDEX IF NOT EXISTS idx_liquidacoes_multiplas_liquidacao_principal ON public.liquidacoes_multiplas(liquidacao_principal_id);
