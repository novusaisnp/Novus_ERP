-- Cadastro Unificado de Entidades — Fase 2c (ERP): Clientes
-- Caso especial (schema duplo já documentado): `clientes` tem colunas
-- legadas (`tipo`, `cpf_cnpj`, `endereco` jsonb, `apelido`) e novas
-- (`tipo_pessoa`, `cpf`, `cnpj`) coexistindo na mesma linha. Backfill usa
-- COALESCE priorizando o conjunto novo, caindo pro legado. Tabela de
-- origem vazia no momento desta migração (0 linhas, confirmado em
-- baseline) — backfill é defensivo/idempotente pra dado futuro.

-- 1) Backfill: clientes → entidades + entidade_papeis
INSERT INTO public.entidades (
  id, empresa_representada_id, tipo_pessoa, nome, razao_social, nome_fantasia, apelido,
  cpf, cnpj, rg, inscricao_estadual, inscricao_municipal, data_nascimento, data_fundacao,
  email, email_secundario, telefone, celular, whatsapp, website,
  cep, logradouro, numero, complemento, bairro, cidade, estado,
  cnae, forma_atuacao, atividade_principal, setor_id,
  contato_empresa, contatos, documentos, dados_pessoais, qualificacao_fiscal,
  limite_credito, observacoes, ativo, deleted_at
)
SELECT
  c.id, c.empresa_representada_id,
  COALESCE(c.tipo_pessoa, CASE c.tipo WHEN 'F' THEN 'PF' WHEN 'J' THEN 'PJ' ELSE 'PF' END),
  c.nome, c.razao_social, c.nome_fantasia, c.apelido,
  COALESCE(c.cpf, CASE WHEN length(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = 11 THEN regexp_replace(c.cpf_cnpj, '\D', '', 'g') END),
  COALESCE(c.cnpj, CASE WHEN length(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = 14 THEN regexp_replace(c.cpf_cnpj, '\D', '', 'g') END),
  c.rg, c.inscricao_estadual, c.inscricao_municipal, c.data_nascimento, c.data_fundacao,
  c.email, c.email_secundario, COALESCE(c.telefone, c.telefones[1]), c.celular, c.whatsapp,
  COALESCE(c.website, c.site),
  COALESCE(c.cep, c.endereco ->> 'cep'), COALESCE(c.logradouro, c.endereco ->> 'logradouro'),
  COALESCE(c.numero, c.endereco ->> 'numero'), COALESCE(c.complemento, c.endereco ->> 'complemento'),
  COALESCE(c.bairro, c.endereco ->> 'bairro'), COALESCE(c.cidade, c.endereco ->> 'cidade'),
  COALESCE(c.estado, c.endereco ->> 'uf'),
  c.cnae, c.forma_atuacao, c.atividade_principal, c.setor_id,
  c.contato_empresa, c.contatos, c.documentos, c.dados_pessoais, c.qualificacao_fiscal,
  c.limite_credito, c.observacoes, c.ativo, c.deleted_at
FROM public.clientes c
WHERE NOT EXISTS (
  SELECT 1 FROM public.entidades e
  WHERE e.empresa_representada_id = c.empresa_representada_id
    AND (
      (COALESCE(c.cnpj, CASE WHEN length(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = 14 THEN regexp_replace(c.cpf_cnpj, '\D', '', 'g') END) IS NOT NULL
       AND e.cnpj = COALESCE(c.cnpj, CASE WHEN length(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = 14 THEN regexp_replace(c.cpf_cnpj, '\D', '', 'g') END))
      OR
      (COALESCE(c.cpf, CASE WHEN length(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = 11 THEN regexp_replace(c.cpf_cnpj, '\D', '', 'g') END) IS NOT NULL
       AND e.cpf = COALESCE(c.cpf, CASE WHEN length(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = 11 THEN regexp_replace(c.cpf_cnpj, '\D', '', 'g') END))
    )
);

INSERT INTO public.entidade_id_map (tabela_origem, id_origem, entidade_id)
SELECT 'clientes', c.id, e.id
FROM public.clientes c
JOIN public.entidades e ON e.empresa_representada_id = c.empresa_representada_id
  AND (
    (c.cnpj IS NOT NULL AND e.cnpj = c.cnpj) OR (c.cpf IS NOT NULL AND e.cpf = c.cpf)
  )
WHERE e.id <> c.id;

INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel, ativo)
SELECT COALESCE(m.entidade_id, c.id), c.empresa_representada_id, 'CLIENTE', c.ativo
FROM public.clientes c
LEFT JOIN public.entidade_id_map m ON m.tabela_origem = 'clientes' AND m.id_origem = c.id
ON CONFLICT (entidade_id, papel) DO NOTHING;

-- 2) Realinhar FK — mantém nome de coluna (cliente_id / cliente_billing_id)
ALTER TABLE public.contas_receber DROP CONSTRAINT contas_receber_cliente_id_fkey;
ALTER TABLE public.contas_receber ADD CONSTRAINT contas_receber_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.entidades(id);

ALTER TABLE public.vendas DROP CONSTRAINT vendas_cliente_id_fkey;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.entidades(id);

ALTER TABLE public.contratos DROP CONSTRAINT contratos_cliente_id_fkey;
ALTER TABLE public.contratos ADD CONSTRAINT contratos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.entidades(id);

ALTER TABLE public.orcamentos_venda DROP CONSTRAINT orcamentos_venda_cliente_id_fkey;
ALTER TABLE public.orcamentos_venda ADD CONSTRAINT orcamentos_venda_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.entidades(id) ON DELETE SET NULL;

ALTER TABLE public.cliente_politica_pagamento DROP CONSTRAINT cliente_politica_pagamento_cliente_id_fkey;
ALTER TABLE public.cliente_politica_pagamento ADD CONSTRAINT cliente_politica_pagamento_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.entidades(id) ON DELETE CASCADE;

ALTER TABLE public.cliente_modalidades_bloqueadas DROP CONSTRAINT cliente_modalidades_bloqueadas_cliente_id_fkey;
ALTER TABLE public.cliente_modalidades_bloqueadas ADD CONSTRAINT cliente_modalidades_bloqueadas_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.entidades(id) ON DELETE CASCADE;

ALTER TABLE centelha.responsaveis DROP CONSTRAINT responsaveis_cliente_billing_id_fkey;
ALTER TABLE centelha.responsaveis ADD CONSTRAINT responsaveis_cliente_billing_id_fkey
  FOREIGN KEY (cliente_billing_id) REFERENCES public.entidades(id);

-- 3) Corte seco
DROP TABLE public.clientes;
