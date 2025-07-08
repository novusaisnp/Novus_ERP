-- Expandir tabela clientes para suportar dados específicos de PJ
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS nome_fantasia character varying(255),
ADD COLUMN IF NOT EXISTS cnae character varying(20),
ADD COLUMN IF NOT EXISTS site character varying(500),
ADD COLUMN IF NOT EXISTS forma_atuacao character varying(50),
ADD COLUMN IF NOT EXISTS data_fundacao date,
ADD COLUMN IF NOT EXISTS atividade_principal text,
ADD COLUMN IF NOT EXISTS contato_empresa jsonb DEFAULT '{"nome_completo": "", "departamento": "", "cargo": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS documentos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emails jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS telefones jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS dados_pessoais jsonb DEFAULT '{"estado_civil": "", "profissao": "", "escolaridade": "", "meios_comunicacao_preferenciais": []}'::jsonb;

-- Migrar dados existentes do campo endereco para os novos campos
UPDATE public.clientes 
SET 
  emails = COALESCE(endereco->'emails', '[]'::jsonb),
  telefones = COALESCE(endereco->'telefones', '[]'::jsonb),
  dados_pessoais = COALESCE(endereco->'dadosPessoais', '{"estado_civil": "", "profissao": "", "escolaridade": "", "meios_comunicacao_preferenciais": []}'::jsonb),
  nome_fantasia = endereco->'dadosEmpresa'->>'nomeFantasia',
  cnae = endereco->'dadosEmpresa'->>'cnae',
  site = endereco->'dadosEmpresa'->>'site',
  forma_atuacao = endereco->'dadosEmpresa'->>'formaAtuacao',
  data_fundacao = CASE 
    WHEN endereco->'dadosEmpresa'->>'dataFundacao' IS NOT NULL AND endereco->'dadosEmpresa'->>'dataFundacao' != ''
    THEN (endereco->'dadosEmpresa'->>'dataFundacao')::date
    ELSE NULL
  END,
  atividade_principal = endereco->'dadosEmpresa'->>'atividadePrincipal',
  contato_empresa = COALESCE(endereco->'dadosEmpresa'->'contatoEmpresa', '{"nome_completo": "", "departamento": "", "cargo": ""}'::jsonb),
  documentos = COALESCE(endereco->'documentos', '[]'::jsonb)
WHERE endereco IS NOT NULL;

-- Limpar o campo endereco para conter apenas dados de endereço
UPDATE public.clientes 
SET endereco = jsonb_build_object(
  'cep', endereco->>'cep',
  'logradouro', endereco->>'logradouro',
  'numero', endereco->>'numero',
  'complemento', endereco->>'complemento',
  'bairro', endereco->>'bairro',
  'cidade', endereco->>'cidade',
  'uf', endereco->>'uf',
  'pais', COALESCE(endereco->>'pais', 'Brasil')
)
WHERE endereco IS NOT NULL;