
-- Criar enum para tipos de operação
CREATE TYPE operacao_tipo AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE');

-- Criar tabela de histórico de operações centralizado
CREATE TABLE public.historico_operacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  tabela_nome VARCHAR(100) NOT NULL,
  registro_id UUID NOT NULL,
  operacao operacao_tipo NOT NULL,
  dados_antigos JSONB,
  dados_novos JSONB,
  ip_address INET,
  user_agent TEXT,
  origem VARCHAR(50) DEFAULT 'WEB',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sessao_id UUID
);

-- Proteger tabela de auditoria contra modificações
ALTER TABLE public.historico_operacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver histórico" ON public.historico_operacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u 
      JOIN public.perfis p ON u.perfil_id = p.id 
      WHERE u.id = auth.uid()::text 
      AND p.codigo = 'ADMIN'
    )
  );

CREATE POLICY "Sistema pode inserir no histórico" ON public.historico_operacoes
  FOR INSERT WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_historico_operacoes_tabela_registro ON public.historico_operacoes(tabela_nome, registro_id);
CREATE INDEX idx_historico_operacoes_usuario_data ON public.historico_operacoes(usuario_id, created_at);
CREATE INDEX idx_historico_operacoes_created_at ON public.historico_operacoes(created_at);

-- Função genérica para registrar operações no histórico
CREATE OR REPLACE FUNCTION public.registrar_historico_operacao(
  p_tabela_nome VARCHAR,
  p_registro_id UUID,
  p_operacao operacao_tipo,
  p_dados_antigos JSONB DEFAULT NULL,
  p_dados_novos JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_origem VARCHAR DEFAULT 'WEB'
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_historico_id UUID;
BEGIN
  INSERT INTO public.historico_operacoes (
    usuario_id,
    tabela_nome,
    registro_id,
    operacao,
    dados_antigos,
    dados_novos,
    ip_address,
    user_agent,
    origem,
    sessao_id
  ) VALUES (
    auth.uid(),
    p_tabela_nome,
    p_registro_id,
    p_operacao,
    p_dados_antigos,
    p_dados_novos,
    p_ip_address,
    p_user_agent,
    p_origem,
    gen_random_uuid()
  ) RETURNING id INTO v_historico_id;
  
  RETURN v_historico_id;
END;
$$;

-- Função genérica para soft delete
CREATE OR REPLACE FUNCTION public.soft_delete_with_audit(
  p_tabela_nome VARCHAR,
  p_registro_id UUID,
  p_dados_antigos JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
  v_count INTEGER;
BEGIN
  -- Verificar se o registro existe e não está já deletado
  v_sql := format('SELECT COUNT(*) FROM public.%I WHERE id = $1 AND deleted_at IS NULL', p_tabela_nome);
  EXECUTE v_sql USING p_registro_id INTO v_count;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Registro não encontrado ou já foi arquivado';
  END IF;
  
  -- Realizar soft delete
  v_sql := format('UPDATE public.%I SET deleted_at = now() WHERE id = $1', p_tabela_nome);
  EXECUTE v_sql USING p_registro_id;
  
  -- Registrar no histórico
  PERFORM public.registrar_historico_operacao(
    p_tabela_nome,
    p_registro_id,
    'ARCHIVE'::operacao_tipo,
    p_dados_antigos,
    jsonb_build_object('deleted_at', now())
  );
  
  RETURN TRUE;
END;
$$;

-- Adicionar deleted_at nas tabelas críticas existentes
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.descontos_padrao ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.vencimentos_padrao ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.centros_custo ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.plano_contas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.categorias_produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.localizacoes_estoque ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.tamanhos_produtos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.unidades_medida ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Criar índices para deleted_at em todas as tabelas
CREATE INDEX IF NOT EXISTS idx_cargos_deleted_at ON public.cargos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_departamentos_deleted_at ON public.departamentos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_colaboradores_deleted_at ON public.colaboradores(deleted_at);
CREATE INDEX IF NOT EXISTS idx_descontos_padrao_deleted_at ON public.descontos_padrao(deleted_at);
CREATE INDEX IF NOT EXISTS idx_vencimentos_padrao_deleted_at ON public.vencimentos_padrao(deleted_at);
CREATE INDEX IF NOT EXISTS idx_centros_custo_deleted_at ON public.centros_custo(deleted_at);
CREATE INDEX IF NOT EXISTS idx_plano_contas_deleted_at ON public.plano_contas(deleted_at);
CREATE INDEX IF NOT EXISTS idx_produtos_deleted_at ON public.produtos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clientes_deleted_at ON public.clientes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_fornecedores_deleted_at ON public.fornecedores(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categorias_produtos_deleted_at ON public.categorias_produtos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_localizacoes_estoque_deleted_at ON public.localizacoes_estoque(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tamanhos_produtos_deleted_at ON public.tamanhos_produtos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_unidades_medida_deleted_at ON public.unidades_medida(deleted_at);

-- Função template para criar triggers de auditoria
CREATE OR REPLACE FUNCTION public.create_audit_trigger(table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  trigger_name TEXT;
  function_name TEXT;
BEGIN
  trigger_name := table_name || '_audit_trigger';
  function_name := table_name || '_audit_function';
  
  -- Criar função de trigger específica para a tabela
  EXECUTE format('
    CREATE OR REPLACE FUNCTION public.%I()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      IF TG_OP = ''INSERT'' THEN
        PERFORM public.registrar_historico_operacao(
          %L,
          NEW.id,
          ''CREATE''::operacao_tipo,
          NULL,
          row_to_json(NEW)::jsonb
        );
        RETURN NEW;
      ELSIF TG_OP = ''UPDATE'' THEN
        PERFORM public.registrar_historico_operacao(
          %L,
          NEW.id,
          ''UPDATE''::operacao_tipo,
          row_to_json(OLD)::jsonb,
          row_to_json(NEW)::jsonb
        );
        RETURN NEW;
      ELSIF TG_OP = ''DELETE'' THEN
        -- Bloquear exclusão física em tabelas críticas
        RAISE EXCEPTION ''Exclusão física não permitida. Use arquivamento (soft delete).'';
      END IF;
      RETURN NULL;
    END;
    $func$;
  ', function_name, table_name, table_name);
  
  -- Criar trigger
  EXECUTE format('
    DROP TRIGGER IF EXISTS %I ON public.%I;
    CREATE TRIGGER %I
      AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.%I();
  ', trigger_name, table_name, trigger_name, table_name, function_name);
  
END;
$$;

-- Aplicar triggers de auditoria nas tabelas críticas
SELECT public.create_audit_trigger('cargos');
SELECT public.create_audit_trigger('departamentos');
SELECT public.create_audit_trigger('colaboradores');
SELECT public.create_audit_trigger('descontos_padrao');
SELECT public.create_audit_trigger('vencimentos_padrao');
SELECT public.create_audit_trigger('centros_custo');
SELECT public.create_audit_trigger('plano_contas');
SELECT public.create_audit_trigger('produtos');
SELECT public.create_audit_trigger('clientes');
SELECT public.create_audit_trigger('fornecedores');
SELECT public.create_audit_trigger('categorias_produtos');
SELECT public.create_audit_trigger('localizacoes_estoque');
SELECT public.create_audit_trigger('tamanhos_produtos');
SELECT public.create_audit_trigger('unidades_medida');
