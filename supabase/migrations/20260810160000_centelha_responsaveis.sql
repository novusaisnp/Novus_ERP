-- Hierarquia Centelha -> Responsável (cliente pagante da NOVUS) -> Representada (CNPJ operacional).
-- Responsável mora no schema centelha (não em public.clientes) de propósito: dado de "quem é
-- cliente da NOVUS" herda o mesmo isolamento (sem grant pra authenticated/anon) do resto do
-- Centelha, em vez de ficar alcançável como qualquer cliente comum do ERP. Ver
-- docs/CONTRATOS_CANONICOS_ERP.md e STATUS.md pro contexto completo.

CREATE TABLE centelha.responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  cliente_billing_id uuid REFERENCES public.clientes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE centelha.responsaveis ENABLE ROW LEVEL SECURITY;
GRANT ALL ON centelha.responsaveis TO service_role;

-- centelha.licencas apontava pra public.clientes (fatia 1 anterior) — corrige antes de qualquer
-- licença real existir (0 linhas confirmado antes de rodar esta migration).
ALTER TABLE centelha.licencas RENAME COLUMN cliente_id TO responsavel_id;
ALTER TABLE centelha.licencas DROP CONSTRAINT licencas_cliente_id_fkey;
ALTER TABLE centelha.licencas ADD CONSTRAINT licencas_responsavel_id_fkey
  FOREIGN KEY (responsavel_id) REFERENCES centelha.responsaveis(id);

-- nullable: representadas sem grupo (ex. fixture de teste E2E TEST CO) continuam funcionando,
-- aparecem "sem grupo" no seletor de empresa.
ALTER TABLE public.empresas_representadas
  ADD COLUMN responsavel_id uuid REFERENCES centelha.responsaveis(id);

CREATE OR REPLACE FUNCTION public.get_empresas_disponiveis()
RETURNS TABLE (
  representada_id uuid,
  representada_nome text,
  representada_cnpj text,
  responsavel_id uuid,
  responsavel_nome text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, centelha
AS $$
  SELECT er.id, er.nome, er.cnpj, er.responsavel_id, r.nome
  FROM public.empresas_representadas er
  LEFT JOIN centelha.responsaveis r ON r.id = er.responsavel_id
  WHERE er.ativo = true
    AND (
      public.has_role(auth.uid(), 'novus_owner')
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.empresa_representada_id = er.id
      )
    )
  ORDER BY r.nome NULLS LAST, er.nome;
$$;
