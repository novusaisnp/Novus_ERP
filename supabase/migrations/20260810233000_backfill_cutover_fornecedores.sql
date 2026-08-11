-- Cadastro Unificado de Entidades — Fase 2b (ERP): Fornecedores
-- Tabela de origem vazia no momento desta migração — backfill é
-- defensivo/idempotente, não migra nada real agora.

-- 1) Backfill: fornecedores → entidades + entidade_papeis
INSERT INTO public.entidades (
  id, empresa_representada_id, tipo_pessoa, nome, razao_social, nome_fantasia, cpf, cnpj,
  inscricao_estadual, inscricao_municipal, email, email_secundario, telefone, celular, whatsapp,
  cep, logradouro, numero, complemento, bairro, cidade, estado, banco, agencia, conta, tipo_conta,
  pix, prazo_entrega, ativo, deleted_at
)
SELECT f.id, f.empresa_representada_id, COALESCE(f.tipo_pessoa, 'PJ'), f.nome, f.razao_social, f.nome_fantasia,
  f.cpf, f.cnpj, f.inscricao_estadual, f.inscricao_municipal, f.email, f.email_secundario, f.telefone,
  f.celular, f.whatsapp, f.cep, f.logradouro, f.numero, f.complemento, f.bairro, f.cidade, f.estado,
  f.banco, f.agencia, f.conta, f.tipo_conta, f.pix, f.prazo_entrega, f.ativo, f.deleted_at
FROM public.fornecedores f
WHERE NOT EXISTS (
  SELECT 1 FROM public.entidades e
  WHERE e.empresa_representada_id = f.empresa_representada_id
    AND ((f.cnpj IS NOT NULL AND e.cnpj = f.cnpj) OR (f.cpf IS NOT NULL AND e.cpf = f.cpf))
);

INSERT INTO public.entidade_id_map (tabela_origem, id_origem, entidade_id)
SELECT 'fornecedores', f.id, e.id
FROM public.fornecedores f
JOIN public.entidades e ON e.empresa_representada_id = f.empresa_representada_id
  AND ((f.cnpj IS NOT NULL AND e.cnpj = f.cnpj) OR (f.cpf IS NOT NULL AND e.cpf = f.cpf))
WHERE e.id <> f.id;

INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel, ativo)
SELECT COALESCE(m.entidade_id, f.id), f.empresa_representada_id, 'FORNECEDOR', f.ativo
FROM public.fornecedores f
LEFT JOIN public.entidade_id_map m ON m.tabela_origem = 'fornecedores' AND m.id_origem = f.id
ON CONFLICT (entidade_id, papel) DO NOTHING;

-- 2) Realinhar FK — mantém nome de coluna (fornecedor_id)
ALTER TABLE public.contas_pagar DROP CONSTRAINT contas_pagar_fornecedor_id_fkey;
ALTER TABLE public.contas_pagar ADD CONSTRAINT contas_pagar_fornecedor_id_fkey
  FOREIGN KEY (fornecedor_id) REFERENCES public.entidades(id);

ALTER TABLE public.produto_fornecedores DROP CONSTRAINT produto_fornecedores_fornecedor_id_fkey;
ALTER TABLE public.produto_fornecedores ADD CONSTRAINT produto_fornecedores_fornecedor_id_fkey
  FOREIGN KEY (fornecedor_id) REFERENCES public.entidades(id) ON DELETE CASCADE;

-- 3) Corte seco
DROP TABLE public.fornecedores;
