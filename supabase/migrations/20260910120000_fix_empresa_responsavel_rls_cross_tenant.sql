-- Achado real (2026-09-10): as 4 policies de public.empresa_responsavel usavam
-- has_role(auth.uid(),'admin') SEM escopo de empresa — qualquer admin de
-- QUALQUER empresa do sistema conseguia ler/editar/apagar essa linha, que hoje
-- é o cadastro real da Allegra (CNPJ, e-mail, telefone, endereço, config
-- fiscal). Ficou invisível enquanto só existia uma empresa no sistema inteiro
-- (todo admin era, por acaso, admin da Allegra); virou explorável de verdade
-- assim que um segundo tenant (E2E TEST CO) passou a ter um admin próprio.
--
-- Stopgap urgente: trava as 4 operações só pra novus_owner (acesso universal
-- já implicado por has_role_novus_owner_implies_all.sql), até a migração
-- seguinte tornar a tabela escopada por empresa de verdade.

DROP POLICY IF EXISTS "Admins podem ler empresa_responsavel" ON public.empresa_responsavel;
DROP POLICY IF EXISTS "Admins podem inserir empresa_responsavel" ON public.empresa_responsavel;
DROP POLICY IF EXISTS "Admins podem atualizar empresa_responsavel" ON public.empresa_responsavel;
DROP POLICY IF EXISTS "Admins podem deletar empresa_responsavel" ON public.empresa_responsavel;

CREATE POLICY "novus_owner_select_empresa_responsavel"
  ON public.empresa_responsavel FOR SELECT
  USING (public.has_role(auth.uid(), 'novus_owner'));

CREATE POLICY "novus_owner_insert_empresa_responsavel"
  ON public.empresa_responsavel FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'novus_owner'));

CREATE POLICY "novus_owner_update_empresa_responsavel"
  ON public.empresa_responsavel FOR UPDATE
  USING (public.has_role(auth.uid(), 'novus_owner'))
  WITH CHECK (public.has_role(auth.uid(), 'novus_owner'));

CREATE POLICY "novus_owner_delete_empresa_responsavel"
  ON public.empresa_responsavel FOR DELETE
  USING (public.has_role(auth.uid(), 'novus_owner'));
