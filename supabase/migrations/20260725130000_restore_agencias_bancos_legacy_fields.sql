-- Mesma situação de 20260724190000 (contas_bancarias), agora em agencias_bancarias e
-- bancos: o redesenho de Gestão Bancária (20260710135935) recriou as duas tabelas com
-- nomes de coluna diferentes (numero_agencia -> numero, descricao -> nome em
-- agencias_bancarias; sigla/pais removidos de bancos), mas nenhum lugar do app foi
-- atualizado — todo o código (agenciaService.ts, bancoService.ts,
-- contaBancariaService.ts, movimentacoesBancariasService.ts, telas de Gestão
-- Bancária) usa exclusivamente os nomes antigos. As colunas novas (numero/nome em
-- agencias_bancarias; ispb/logo_url/nome_curto/site em bancos) não são referenciadas
-- em nenhum lugar do código-fonte hoje — mantidas como estão, sem remover nada.

ALTER TABLE public.agencias_bancarias
  ADD COLUMN IF NOT EXISTS numero_agencia varchar(20),
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- endereco era texto livre no redesenho; a UI sempre tratou como objeto estruturado
-- (rua/numero/complemento/cidade/estado/cep). Preserva qualquer valor existente
-- dentro do novo formato em vez de descartar.
ALTER TABLE public.agencias_bancarias
  ALTER COLUMN endereco TYPE jsonb USING (
    CASE WHEN endereco IS NULL OR endereco = '' THEN NULL
         ELSE jsonb_build_object('rua', endereco)
    END
  );

CREATE INDEX IF NOT EXISTS idx_agencias_bancarias_deleted_at ON public.agencias_bancarias(deleted_at);
CREATE INDEX IF NOT EXISTS idx_agencias_bancarias_numero_agencia ON public.agencias_bancarias(numero_agencia);

ALTER TABLE public.bancos
  ADD COLUMN IF NOT EXISTS sigla varchar(20),
  ADD COLUMN IF NOT EXISTS pais varchar(50) NOT NULL DEFAULT 'Brasil';
