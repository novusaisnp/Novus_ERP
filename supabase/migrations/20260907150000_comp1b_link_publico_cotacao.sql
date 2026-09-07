-- COMP-1b (extensão): link público de cotação — fornecedor preenche o próprio
-- preço sem precisar de login no NOVUS ERP. O "token" é o próprio id (uuid
-- aleatório) da linha em cotacoes_compra_fornecedores — nenhuma coluna nova
-- de segredo necessária, só marcar quando o fornecedor respondeu.
--
-- A escrita pública não passa por RLS/policy nenhuma — é feita 100% pela
-- edge function compras-cotacao-publica, usando a service_role key, com toda
-- a validação (cotação ABERTA, item pertence à requisição certa, preço só do
-- próprio fornecedor do convite) no código da function. Mesma filosofia de
-- segurança de entidade-preflight/webhook: a function É o gate, não RLS pra
-- anon.

ALTER TABLE public.cotacoes_compra_fornecedores
  ADD COLUMN respondido_em timestamptz;
