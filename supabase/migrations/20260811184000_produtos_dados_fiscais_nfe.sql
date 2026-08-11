ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS dados_fiscais jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT produtos_dados_fiscais_objeto_check CHECK (jsonb_typeof(dados_fiscais) = 'object'),
  ADD CONSTRAINT produtos_dados_fiscais_nfe_check CHECK (
    dados_fiscais = '{}'::jsonb OR (
      dados_fiscais->>'icms_situacao_tributaria' ~ '^[0-9]{2,4}$'
      AND dados_fiscais->>'pis_situacao_tributaria' ~ '^[0-9]{2}$'
      AND dados_fiscais->>'cofins_situacao_tributaria' ~ '^[0-9]{2}$'
      AND dados_fiscais->>'ibs_cbs_situacao_tributaria' ~ '^[0-9]{3}$'
      AND dados_fiscais->>'ibs_cbs_classificacao_tributaria' ~ '^[0-9]{6}$'
      AND (dados_fiscais->>'icms_aliquota')::numeric BETWEEN 0 AND 100
      AND (dados_fiscais->>'pis_aliquota')::numeric BETWEEN 0 AND 100
      AND (dados_fiscais->>'cofins_aliquota')::numeric BETWEEN 0 AND 100
      AND (dados_fiscais->>'ibs_uf_aliquota')::numeric BETWEEN 0 AND 100
      AND (dados_fiscais->>'ibs_mun_aliquota')::numeric BETWEEN 0 AND 100
      AND (dados_fiscais->>'cbs_aliquota')::numeric BETWEEN 0 AND 100
    )
  );

COMMENT ON COLUMN public.produtos.dados_fiscais IS
  'Perfil fiscal explícito usado na NF-e. Vazio impede emissão real; nunca inferir CST/classificação.';
