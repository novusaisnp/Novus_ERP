-- Corrige achado de passagem do FIN-1 (cadastro rápido de entidade): as 4
-- funções de trigger de auditoria criadas em 20260825120000/20260829120100
-- (registrar_historico_entidade_papel, registrar_historico_usuario_perfil,
-- registrar_historico_user_role, registrar_historico_colaborador_cargo)
-- rodavam como SECURITY INVOKER (padrão do Postgres). As tabelas de
-- histórico só concedem SELECT a `authenticated` e só têm policy de SELECT
-- ("append-only" — só a trigger deveria escrever) — sem SECURITY DEFINER, a
-- própria trigger tenta inserir como o usuário chamador e é barrada (403),
-- derrubando a transação inteira do INSERT/UPDATE original.
--
-- Confirmado ao vivo 2026-09-08: `entidadeService.createEntidade()` (usado
-- por qualquer criação de Cliente/Fornecedor/Colaborador/etc, inclusive o
-- novo cadastro rápido nos formulários financeiros) cria a `entidades` com
-- sucesso e falha com 403 no insert de `entidade_papeis`, órfão sem papel.
-- Mesma classe de bug bloqueia: editar cargo/departamento/setor de
-- colaborador (`entidade_dados_colaborador`), mudar `usuarios.perfil_id`, e
-- qualquer INSERT/UPDATE/DELETE em `user_roles`.
--
-- Fix aditivo: só adiciona SECURITY DEFINER + search_path fixo (convenção já
-- usada em lancar_titulo_criado/seed_plano_contas_nova_empresa/etc) às 4
-- funções — corpo e assinatura inalterados, RLS/policies das tabelas de
-- histórico continuam como estavam (select-only pro cliente, exatamente
-- como documentado nos comentários originais).

CREATE OR REPLACE FUNCTION public.registrar_historico_entidade_papel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_entidade_papeis (
      entidade_papel_id, entidade_id, empresa_representada_id, papel, tipo_operacao, dados_novos, usuario_id
    ) VALUES (
      NEW.id, NEW.entidade_id, NEW.empresa_representada_id, NEW.papel, 'CRIACAO', to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_entidade_papeis (
      entidade_papel_id, entidade_id, empresa_representada_id, papel, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES (
      NEW.id, NEW.entidade_id, NEW.empresa_representada_id, NEW.papel,
      CASE
        WHEN NEW.ativo = true AND OLD.ativo = false THEN 'ATIVACAO'
        WHEN NEW.ativo = false AND OLD.ativo = true THEN 'DESATIVACAO'
        ELSE 'EDICAO'
      END,
      to_jsonb(OLD), to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_entidade_papeis (
      entidade_papel_id, entidade_id, empresa_representada_id, papel, tipo_operacao, dados_anteriores, usuario_id
    ) VALUES (
      OLD.id, OLD.entidade_id, OLD.empresa_representada_id, OLD.papel, 'EXCLUSAO', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_historico_usuario_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.perfil_id IS DISTINCT FROM OLD.perfil_id THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES (
      'usuarios.perfil_id', NEW.id, NEW.empresa_representada_id, 'EDICAO',
      jsonb_build_object('perfil_id', OLD.perfil_id),
      jsonb_build_object('perfil_id', NEW.perfil_id),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_historico_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_novos, usuario_id
    ) VALUES ('user_roles', NEW.user_id, NEW.empresa_representada_id, 'CRIACAO', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_anteriores, dados_novos, usuario_id
    ) VALUES ('user_roles', NEW.user_id, NEW.empresa_representada_id, 'EDICAO', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.historico_usuarios_perfil (
      fonte, usuario_alvo_id, empresa_representada_id, tipo_operacao, dados_anteriores, usuario_id
    ) VALUES ('user_roles', OLD.user_id, OLD.empresa_representada_id, 'EXCLUSAO', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_historico_colaborador_cargo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.historico_colaboradores_cargo (
    entidade_id, dados_anteriores, dados_novos, usuario_id
  ) VALUES (
    NEW.entidade_id,
    jsonb_build_object('cargo_id', OLD.cargo_id, 'departamento_id', OLD.departamento_id, 'setor_id', OLD.setor_id),
    jsonb_build_object('cargo_id', NEW.cargo_id, 'departamento_id', NEW.departamento_id, 'setor_id', NEW.setor_id),
    auth.uid()
  );
  RETURN NEW;
END;
$$;
