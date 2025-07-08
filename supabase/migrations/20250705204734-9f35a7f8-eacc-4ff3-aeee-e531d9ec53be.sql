
-- Corrigir migração para usar os usuários REAIS do banco
-- Primeiro, vamos buscar os dados dos usuários existentes e migrar corretamente

-- Limpar possíveis usuários fictícios criados anteriormente
DELETE FROM auth.users WHERE email IN ('joao.silva@novus.com.br', 'maria.santos@novus.com.br');

-- Inserir os usuários REAIS baseados nos dados da tabela usuarios
-- Vamos usar uma abordagem que funciona com os dados reais
DO $$
DECLARE
    user_record RECORD;
    new_auth_id UUID;
BEGIN
    -- Iterar sobre os usuários existentes na tabela usuarios
    FOR user_record IN 
        SELECT id, nome_completo, email, cpf, perfil_id, empresa_representada_id, ativo
        FROM usuarios 
        WHERE ativo = true
    LOOP
        -- Gerar novo UUID para o auth.users
        new_auth_id := gen_random_uuid();
        
        -- Inserir no auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            new_auth_id,
            '00000000-0000-0000-0000-000000000000',
            user_record.email,
            crypt('123456', gen_salt('bf')), -- Senha temporária
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            json_build_object(
                'nome_completo', user_record.nome_completo,
                'cpf', user_record.cpf
            ),
            false,
            'authenticated'
        );
        
        -- Atualizar o ID na tabela usuarios para referenciar o auth.users
        UPDATE usuarios 
        SET id = new_auth_id
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Migrado usuário: % (ID: %)', user_record.nome_completo, new_auth_id;
    END LOOP;
END $$;

-- Criar função para sincronizar novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Inserir na tabela usuarios quando um novo usuário é criado no auth
  INSERT INTO public.usuarios (
    id,
    nome_completo,
    email,
    cpf,
    perfil_id,
    empresa_representada_id,
    ativo,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cpf', '00000000000'),
    COALESCE(NEW.raw_user_meta_data->>'perfil_id', (SELECT id FROM perfis WHERE codigo = 'USER' LIMIT 1)),
    COALESCE(NEW.raw_user_meta_data->>'empresa_representada_id', (SELECT id FROM empresas_representadas WHERE ativa = true LIMIT 1)),
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atualizar políticas RLS para trabalhar com auth.uid()
DROP POLICY IF EXISTS "Permitir acesso total para usuários autenticados - usuarios" ON usuarios;

CREATE POLICY "Users can view their own data and admins can view all" 
  ON usuarios 
  FOR SELECT 
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      WHERE u.id = auth.uid() AND p.codigo = 'ADMIN'
    )
  );

CREATE POLICY "Users can update their own data and admins can update all" 
  ON usuarios 
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      WHERE u.id = auth.uid() AND p.codigo = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can insert new users" 
  ON usuarios 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      WHERE u.id = auth.uid() AND p.codigo = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can delete users" 
  ON usuarios 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      JOIN perfis p ON u.perfil_id = p.id 
      WHERE u.id = auth.uid() AND p.codigo = 'ADMIN'
    )
  );
