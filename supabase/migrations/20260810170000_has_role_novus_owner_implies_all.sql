-- Regressão real achada em teste ao vivo: ao separar o dono da marca da ALLEGRA (sessão
-- anterior), a conta perdeu o role literal 'admin' que ~146 tabelas fora do Centelha ainda
-- checam direto via has_role(uid,'admin') sem escopo (só clientes/contratos/contas_receber
-- foram corrigidas com has_role_for_empresa). Resultado: novus_owner não lia nem
-- empresas_representadas (nome/CNPJ da empresa some do header).
--
-- Fix na raiz, não por tabela: novus_owner passa a implicar qualquer role em has_role() —
-- as ~146 policies continuam com o texto que já tinham, sem precisar tocar em nenhuma.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'novus_owner'
  )
$$;
