-- Cadastro Unificado de Entidades — Fase 1 (ERP)
-- Schema aditivo: não toca em clientes/fornecedores/colaboradores/socios_representantes
-- ainda (isso é a Fase 2, backfill+cutover por categoria). Ver
-- C:\Users\maxwe\.claude\plans\tranquil-growing-zephyr.md pro plano completo.

-- 1) entidades: forma canônica única (sem o par de colunas dual que `clientes` tem hoje)
CREATE TABLE public.entidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  tipo_pessoa varchar NOT NULL CHECK (tipo_pessoa IN ('PF','PJ')),

  -- Identificação
  nome varchar NOT NULL,
  razao_social varchar,
  nome_fantasia varchar,
  cpf varchar,
  cnpj varchar,
  rg varchar,
  inscricao_estadual varchar,
  inscricao_municipal varchar,
  data_nascimento date,
  data_fundacao date,

  -- Contato
  email varchar,
  email_secundario varchar,
  telefone varchar,
  telefone_secundario varchar,
  celular varchar,
  whatsapp varchar,
  website varchar,

  -- Endereço (flat, segue o schema real de fornecedores/colaboradores — não jsonb)
  cep varchar,
  logradouro varchar,
  numero varchar,
  complemento varchar,
  bairro varchar,
  cidade varchar,
  estado varchar,

  -- Dados bancários (compartilhado por Fornecedor/Colaborador)
  banco varchar,
  agencia varchar,
  conta varchar,
  tipo_conta varchar,
  pix varchar,

  -- Campos que só fazem sentido com papel Cliente/Fornecedor ativo, mas
  -- baratos o bastante pra não merecerem tabela própria
  limite_credito numeric(14,2),
  prazo_entrega integer,

  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entidades_empresa ON public.entidades(empresa_representada_id);
CREATE INDEX idx_entidades_cpf ON public.entidades(empresa_representada_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_entidades_cnpj ON public.entidades(empresa_representada_id, cnpj) WHERE cnpj IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entidades TO authenticated;
GRANT ALL ON public.entidades TO service_role;

ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entidades_select_empresa" ON public.entidades
  FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entidades_insert_empresa" ON public.entidades
  FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entidades_update_empresa" ON public.entidades
  FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entidades_delete_empresa" ON public.entidades
  FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_entidades_updated_at
  BEFORE UPDATE ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) papeis_catalogo: catálogo de papéis + regra de PF/PJ permitido por papel
CREATE TABLE public.papeis_catalogo (
  codigo varchar PRIMARY KEY,
  nome_exibicao varchar NOT NULL,
  tipo_pessoa_permitido varchar NOT NULL CHECK (tipo_pessoa_permitido IN ('PF','PJ','AMBOS')),
  ativo boolean NOT NULL DEFAULT true
);

INSERT INTO public.papeis_catalogo (codigo, nome_exibicao, tipo_pessoa_permitido) VALUES
  ('CLIENTE', 'Cliente', 'AMBOS'),
  ('FORNECEDOR', 'Fornecedor', 'AMBOS'),
  ('PRESTADOR', 'Prestador de Serviço', 'AMBOS'),
  ('COLABORADOR', 'Colaborador', 'PF'),
  ('SOCIO', 'Sócio', 'PF'),
  ('REPRESENTANTE_LEGAL', 'Representante Legal', 'PF'),
  ('PROCURADOR', 'Procurador', 'PF');

GRANT SELECT ON public.papeis_catalogo TO authenticated;
GRANT ALL ON public.papeis_catalogo TO service_role;

ALTER TABLE public.papeis_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "papeis_catalogo_select_all" ON public.papeis_catalogo
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "papeis_catalogo_admin_write" ON public.papeis_catalogo
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) entidade_papeis: quais papéis cada entidade exerce
CREATE TABLE public.entidade_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  papel varchar NOT NULL REFERENCES public.papeis_catalogo(codigo),
  ativo boolean NOT NULL DEFAULT true,
  ativado_em timestamptz NOT NULL DEFAULT now(),
  desativado_em timestamptz,
  -- Campos específicos de papel Sócio/Representante — só 2 colunas, não
  -- justificam tabela de extensão própria (diferente de Colaborador, ver
  -- entidade_dados_colaborador abaixo)
  participacao_percentual numeric(5,2),
  cargo_societario varchar,
  UNIQUE(entidade_id, papel)
);

CREATE INDEX idx_entidade_papeis_entidade ON public.entidade_papeis(entidade_id);
CREATE INDEX idx_entidade_papeis_empresa_papel ON public.entidade_papeis(empresa_representada_id, papel);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entidade_papeis TO authenticated;
GRANT ALL ON public.entidade_papeis TO service_role;

ALTER TABLE public.entidade_papeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entidade_papeis_select_empresa" ON public.entidade_papeis
  FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entidade_papeis_insert_empresa" ON public.entidade_papeis
  FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entidade_papeis_update_empresa" ON public.entidade_papeis
  FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entidade_papeis_delete_empresa" ON public.entidade_papeis
  FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

-- Regra de PF/PJ por papel — vive no catálogo, não hardcoded em formulário
CREATE OR REPLACE FUNCTION public.validar_papel_tipo_pessoa()
RETURNS trigger AS $$
DECLARE
  v_tipo_pessoa varchar;
  v_permitido varchar;
BEGIN
  SELECT tipo_pessoa INTO v_tipo_pessoa FROM public.entidades WHERE id = NEW.entidade_id;
  SELECT tipo_pessoa_permitido INTO v_permitido FROM public.papeis_catalogo WHERE codigo = NEW.papel;

  IF v_permitido IS NOT NULL AND v_permitido <> 'AMBOS' AND v_permitido <> v_tipo_pessoa THEN
    RAISE EXCEPTION 'Papel % não permite entidade do tipo % (permitido: %)', NEW.papel, v_tipo_pessoa, v_permitido;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validar_papel_tipo_pessoa
  BEFORE INSERT OR UPDATE ON public.entidade_papeis
  FOR EACH ROW EXECUTE FUNCTION public.validar_papel_tipo_pessoa();

-- 4) entidade_dados_colaborador: extensão com FK real, não cabem bem em jsonb
CREATE TABLE public.entidade_dados_colaborador (
  entidade_id uuid PRIMARY KEY REFERENCES public.entidades(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.cargos(id),
  departamento_id uuid REFERENCES public.departamentos(id),
  setor_id uuid REFERENCES public.setores_empresa(id),
  data_admissao date,
  data_demissao date,
  tipo_contrato varchar,
  regime_trabalho varchar,
  carga_horaria integer,
  salario numeric(14,2),
  pis varchar,
  ctps varchar,
  serie_ctps varchar,
  foto_url text,
  estado_civil varchar,
  escolaridade varchar,
  sexo varchar
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entidade_dados_colaborador TO authenticated;
GRANT ALL ON public.entidade_dados_colaborador TO service_role;

ALTER TABLE public.entidade_dados_colaborador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entidade_dados_colaborador_select_empresa" ON public.entidade_dados_colaborador
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.entidades e WHERE e.id = entidade_id
      AND (e.empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "entidade_dados_colaborador_write_empresa" ON public.entidade_dados_colaborador
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.entidades e WHERE e.id = entidade_id
      AND (e.empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.entidades e WHERE e.id = entidade_id
      AND (e.empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  ));

-- 5) entidade_id_map: tabela de trabalho da Fase 2 (backfill), dropada no fim
-- da migração de dados. RLS habilitado sem policy = só service_role acessa,
-- intencional (não é o padrão "RLS esquecido" documentado como armadilha).
CREATE TABLE public.entidade_id_map (
  tabela_origem varchar NOT NULL,
  id_origem uuid NOT NULL,
  entidade_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  PRIMARY KEY (tabela_origem, id_origem)
);

ALTER TABLE public.entidade_id_map ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.entidade_id_map TO service_role;

-- 6) usuarios.entidade_id — substitui gradualmente colaborador_id/socio_id.
-- Postgres não aceita subquery em CHECK, então a regra "entidade tem papel
-- COLABORADOR/SOCIO/REPRESENTANTE_LEGAL/PROCURADOR ativo, ou pendente" vira
-- trigger. usuarios_pessoa_xor_chk (colaborador_id/socio_id) fica intacta
-- até a Fase 2 realinhar e dropar essas colunas.
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS entidade_id uuid REFERENCES public.entidades(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_entidade
  ON public.usuarios(entidade_id) WHERE entidade_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validar_usuario_pessoa_papel()
RETURNS trigger AS $$
DECLARE
  v_tem_papel boolean;
BEGIN
  IF NEW.entidade_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.entidade_papeis
    WHERE entidade_id = NEW.entidade_id
      AND papel IN ('COLABORADOR','SOCIO','REPRESENTANTE_LEGAL','PROCURADOR')
      AND ativo = true
  ) INTO v_tem_papel;

  IF NOT v_tem_papel THEN
    RAISE EXCEPTION 'Entidade % não tem papel de Colaborador/Sócio/Representante/Procurador ativo', NEW.entidade_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validar_usuario_pessoa_papel
  BEFORE INSERT OR UPDATE OF entidade_id ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.validar_usuario_pessoa_papel();
