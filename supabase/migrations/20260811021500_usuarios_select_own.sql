-- Login.tsx precisa checar o próprio pessoa_pendente logo após o primeiro
-- login (senha temporária = e-mail), antes de ter qualquer user_roles
-- resolvido -- a policy de SELECT existente ("Usuário vê usuários da mesma
-- empresa") exige user_has_access_to_empresa()/admin, que um usuário recém
-- criado (ou legado nunca vinculado) não tem. Sem isso a query falha
-- silenciosamente via RLS (retorna vazio, não erro) e o painel de definição
-- de senha nunca aparece.
CREATE POLICY "usuarios_select_own" ON public.usuarios
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
