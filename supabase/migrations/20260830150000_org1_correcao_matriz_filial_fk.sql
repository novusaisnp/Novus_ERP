-- ORG-1, correção: reverte grupos_economicos/estabelecimentos (migration
-- 20260830140000) — não batiam com o modelo real do negócio. Decisão do usuário
-- (2026-08-30): empresa_responsavel já É o grupo econômico de uma instalação NOVUS;
-- matriz/filial são outras linhas de empresas_representadas (cada filial tem CNPJ e IE
-- próprios, precisa emitir nota fiscal com identidade própria — realidade fiscal
-- brasileira), nunca um sub-registro dentro de uma só empresa. Consolidação entre grupos
-- de ramos diferentes fica registrada como ideia futura ("ERP Enterprise"), fora de
-- escopo agora — não implementada aqui.
--
-- Troca: em vez de duas tabelas novas, substitui o campo solto que já existia
-- (`configuracoes->>'cnpj_matriz'`, texto livre sem FK) por uma FK real
-- auto-referenciada em empresas_representadas.

DROP TRIGGER IF EXISTS trg_empresas_representadas_matriz ON public.empresas_representadas;
DROP FUNCTION IF EXISTS public.criar_estabelecimento_matriz();
DROP TABLE IF EXISTS public.estabelecimentos;

DROP TABLE IF EXISTS public.grupos_economicos CASCADE;
ALTER TABLE public.empresas_representadas DROP COLUMN IF EXISTS grupo_economico_id;

-- Matriz/filial real: cada filial é sua própria empresa_representada (CNPJ/IE próprios),
-- apontando pra sua matriz por FK em vez do texto livre `cnpj_matriz` em `configuracoes`.
ALTER TABLE public.empresas_representadas
  ADD COLUMN matriz_empresa_representada_id uuid REFERENCES public.empresas_representadas(id),
  ADD CONSTRAINT empresas_representadas_matriz_nao_e_ela_mesma
    CHECK (matriz_empresa_representada_id IS NULL OR matriz_empresa_representada_id <> id);

CREATE INDEX empresas_representadas_matriz_idx
  ON public.empresas_representadas (matriz_empresa_representada_id);

-- Migra o que já existia em texto livre, quando resolvível (mesmo CNPJ, dígitos):
-- não há dado real hoje pra migrar (confirmado contra o banco antes de aplicar), mas a
-- lógica fica pronta para bases futuras sem exigir passo manual.
UPDATE public.empresas_representadas filial
SET matriz_empresa_representada_id = matriz.id
FROM public.empresas_representadas matriz
WHERE filial.configuracoes->>'tipo_vinculo' = 'FILIAL'
  AND filial.configuracoes->>'cnpj_matriz' IS NOT NULL
  AND regexp_replace(matriz.cnpj, '\D', '', 'g') = regexp_replace(filial.configuracoes->>'cnpj_matriz', '\D', '', 'g')
  AND matriz.id <> filial.id;
