ALTER TABLE public.fiscal_configuracoes
  ADD COLUMN IF NOT EXISTS serie_mdfe integer,
  ADD COLUMN IF NOT EXISTS proximo_numero_mdfe bigint,
  ADD COLUMN IF NOT EXISTS rntrc varchar(8),
  ADD CONSTRAINT fiscal_configuracoes_serie_mdfe_check CHECK (serie_mdfe IS NULL OR serie_mdfe BETWEEN 1 AND 999),
  ADD CONSTRAINT fiscal_configuracoes_numero_mdfe_check CHECK (proximo_numero_mdfe IS NULL OR proximo_numero_mdfe > 0),
  ADD CONSTRAINT fiscal_configuracoes_rntrc_check CHECK (rntrc IS NULL OR rntrc ~ '^[0-9]{8}$');

ALTER TABLE public.fiscal_documentos_eletronicos
  DROP CONSTRAINT fiscal_documentos_tipo_check,
  DROP CONSTRAINT fiscal_documentos_modelo_check,
  DROP CONSTRAINT fiscal_documentos_status_check,
  ADD CONSTRAINT fiscal_documentos_tipo_check CHECK (tipo IN ('NFE','NFCE','NFSE','MDFE')),
  ADD CONSTRAINT fiscal_documentos_modelo_check CHECK (
    (tipo = 'NFE' AND modelo = 55) OR
    (tipo = 'NFCE' AND modelo = 65) OR
    (tipo = 'MDFE' AND modelo = 58) OR
    (tipo = 'NFSE' AND modelo IS NULL)
  ),
  ADD CONSTRAINT fiscal_documentos_status_check CHECK (status IN ('RASCUNHO','EM_PROCESSAMENTO','AUTORIZADA','DENEGADA','REJEITADA','CANCELADA','INUTILIZADA','ENCERRADA'));

ALTER TABLE public.fiscal_eventos
  DROP CONSTRAINT fiscal_eventos_tipo_check,
  DROP CONSTRAINT fiscal_eventos_status_check,
  ADD CONSTRAINT fiscal_eventos_tipo_check CHECK (tipo IN (
    'autorizacao','processamento','erro_emissao','cancelamento','erro_cancelamento',
    'cce','erro_cce','consulta','inutilizacao','contingencia','encerramento',
    'inclusao_condutor','inclusao_dfe'
  )),
  ADD CONSTRAINT fiscal_eventos_status_check CHECK (status IN ('processando','autorizada','rejeitada','cancelada','denegada','inutilizada','encerrada','erro'));

CREATE TABLE public.fiscal_mdfe_operacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  documento_id uuid UNIQUE REFERENCES public.fiscal_documentos_eletronicos(id) ON DELETE SET NULL,
  emitente_tipo smallint NOT NULL CHECK (emitente_tipo IN (1,2,3)),
  transportador_tipo smallint CHECK (transportador_tipo IN (1,2,3)),
  uf_inicio char(2) NOT NULL,
  uf_fim char(2) NOT NULL,
  municipios_carregamento jsonb NOT NULL CHECK (jsonb_typeof(municipios_carregamento) = 'array' AND jsonb_array_length(municipios_carregamento) BETWEEN 1 AND 50),
  percursos jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(percursos) = 'array' AND jsonb_array_length(percursos) <= 25),
  municipios_descarregamento jsonb NOT NULL CHECK (jsonb_typeof(municipios_descarregamento) = 'array' AND jsonb_array_length(municipios_descarregamento) BETWEEN 1 AND 100),
  data_hora_previsto_inicio_viagem timestamptz,
  valor_total_carga numeric(15,2) NOT NULL CHECK (valor_total_carga > 0),
  peso_bruto numeric(15,4) NOT NULL CHECK (peso_bruto > 0),
  unidade_peso char(2) NOT NULL CHECK (unidade_peso IN ('01','02')),
  tipo_carga char(2) CHECK (tipo_carga IN ('01','02','03','04','05','06','07','08','09','10','11','12')),
  descricao_produto_predominante varchar(120),
  ncm_produto_predominante char(8) CHECK (ncm_produto_predominante IS NULL OR ncm_produto_predominante ~ '^[0-9]{8}$'),
  veiculo_tracao jsonb NOT NULL CHECK (jsonb_typeof(veiculo_tracao) = 'object'),
  condutores jsonb NOT NULL CHECK (jsonb_typeof(condutores) = 'array' AND jsonb_array_length(condutores) > 0),
  seguros_carga jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(seguros_carga) = 'array'),
  status varchar(20) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','EM_PROCESSAMENTO','AUTORIZADA','REJEITADA','CANCELADA','ENCERRADA')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fiscal_mdfe_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  operacao_id uuid NOT NULL REFERENCES public.fiscal_mdfe_operacoes(id) ON DELETE CASCADE,
  documento_fiscal_id uuid REFERENCES public.fiscal_documentos_eletronicos(id),
  tipo varchar(4) NOT NULL CHECK (tipo IN ('NFE','CTE')),
  chave_acesso char(44) NOT NULL CHECK (chave_acesso ~ '^[0-9]{44}$'),
  codigo_municipio_descarregamento char(7) NOT NULL CHECK (codigo_municipio_descarregamento ~ '^[0-9]{7}$'),
  nome_municipio_descarregamento varchar(60) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operacao_id, chave_acesso)
);

ALTER TABLE public.fiscal_mdfe_operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_mdfe_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY fiscal_mdfe_op_select ON public.fiscal_mdfe_operacoes FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_mdfe_op_insert ON public.fiscal_mdfe_operacoes FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_mdfe_op_update ON public.fiscal_mdfe_operacoes FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY fiscal_mdfe_doc_select ON public.fiscal_mdfe_documentos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_mdfe_doc_insert ON public.fiscal_mdfe_documentos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_mdfe_doc_delete ON public.fiscal_mdfe_documentos FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
