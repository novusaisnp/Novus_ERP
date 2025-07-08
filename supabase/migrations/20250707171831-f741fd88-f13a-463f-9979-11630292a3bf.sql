-- Expandir tabela fornecedores para suportar PJ e PF
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS tipo_pessoa character varying(2) DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PJ', 'PF'));

-- Campos específicos para PJ
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS data_fundacao date,
ADD COLUMN IF NOT EXISTS cnae character varying(10),
ADD COLUMN IF NOT EXISTS capital_social numeric(15,2),
ADD COLUMN IF NOT EXISTS anexos_pj jsonb DEFAULT '{"contrato_social": null, "cartao_cnpj": null, "logotipo": null}'::jsonb;

-- Campos específicos para PF  
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS nome_completo character varying(255),
ADD COLUMN IF NOT EXISTS data_nascimento date,
ADD COLUMN IF NOT EXISTS cpf character varying(14),
ADD COLUMN IF NOT EXISTS rg character varying(20),
ADD COLUMN IF NOT EXISTS orgao_emissor_rg character varying(20),
ADD COLUMN IF NOT EXISTS anexos_pf jsonb DEFAULT '{"comprovante_residencia": null, "copia_rg": null, "cartao_bancario": null}'::jsonb;

-- Campos de contato expandidos
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS telefones jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS endereco_correspondencia jsonb,
ADD COLUMN IF NOT EXISTS usar_endereco_principal_correspondencia boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS contato_principal jsonb DEFAULT '{"nome": "", "cargo": ""}'::jsonb;

-- Informações bancárias
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS dados_bancarios jsonb DEFAULT '{"banco": "", "numero_banco": "", "agencia": "", "conta": "", "tipo_conta": "corrente"}'::jsonb;

-- Informações adicionais
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS referencias_comerciais text,
ADD COLUMN IF NOT EXISTS atividade_principal text,
ADD COLUMN IF NOT EXISTS portfolio_anexo character varying(500),
ADD COLUMN IF NOT EXISTS prazo_entrega_habitual character varying(100),
ADD COLUMN IF NOT EXISTS responsavel_preenchimento jsonb DEFAULT '{"nome": "", "cargo": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS referencias_pessoais text,
ADD COLUMN IF NOT EXISTS horario_atendimento character varying(100);

-- Tornar campos opcionais baseados no tipo
-- Para PJ, cnpj é obrigatório, para PF, cpf é obrigatório
-- Remover constraint NOT NULL do cnpj para permitir PF sem CNPJ
ALTER TABLE public.fornecedores ALTER COLUMN cnpj DROP NOT NULL;

-- Adicionar função de validação via trigger
CREATE OR REPLACE FUNCTION public.validate_fornecedor_tipo()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar campos obrigatórios para PJ
    IF NEW.tipo_pessoa = 'PJ' THEN
        IF NEW.cnpj IS NULL OR NEW.cnpj = '' THEN
            RAISE EXCEPTION 'CNPJ é obrigatório para Pessoa Jurídica';
        END IF;
        IF NEW.razao_social IS NULL OR NEW.razao_social = '' THEN
            RAISE EXCEPTION 'Razão Social é obrigatória para Pessoa Jurídica';
        END IF;
    END IF;
    
    -- Validar campos obrigatórios para PF
    IF NEW.tipo_pessoa = 'PF' THEN
        IF NEW.cpf IS NULL OR NEW.cpf = '' THEN
            RAISE EXCEPTION 'CPF é obrigatório para Pessoa Física';
        END IF;
        IF NEW.nome_completo IS NULL OR NEW.nome_completo = '' THEN
            RAISE EXCEPTION 'Nome completo é obrigatório para Pessoa Física';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação
DROP TRIGGER IF EXISTS trigger_validate_fornecedor_tipo ON public.fornecedores;
CREATE TRIGGER trigger_validate_fornecedor_tipo
    BEFORE INSERT OR UPDATE ON public.fornecedores
    FOR EACH ROW EXECUTE FUNCTION public.validate_fornecedor_tipo();