-- Fluxo de senha temporária = e-mail (login/senha, ver Login.tsx): depois de
-- trocar a senha no primeiro acesso, o próprio usuário precisa limpar seu
-- pessoa_pendente. RLS de usuarios só permite UPDATE por admin ("Admins
-- atualizam usuarios") -- sem esta RPC, um usuário operador/gerente/
-- visualizador comum não consegue destravar a própria conta.
CREATE OR REPLACE FUNCTION public.clear_pessoa_pendente()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.usuarios SET pessoa_pendente = false WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.clear_pessoa_pendente() TO authenticated;
