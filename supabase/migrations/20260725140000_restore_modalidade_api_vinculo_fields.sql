-- ModalidadeAPITab.tsx (tela real de Configurações Básicas) lê codigo_externo, e
-- modalidadeAPIVinculoService.ts faz soft-delete via deleted_at - nenhuma das duas
-- colunas existe na tabela atual.

ALTER TABLE public.modalidade_api_vinculo
  ADD COLUMN IF NOT EXISTS codigo_externo varchar(50),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_modalidade_api_vinculo_deleted_at ON public.modalidade_api_vinculo(deleted_at);
