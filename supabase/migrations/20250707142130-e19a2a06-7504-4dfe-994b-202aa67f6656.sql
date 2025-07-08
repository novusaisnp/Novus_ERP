
-- Criar tabela para contas a pagar
CREATE TABLE public.contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_documento VARCHAR NOT NULL,
  descricao TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  valor_original NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  valor_atual NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  data_vencimento DATE NOT NULL,
  data_emissao DATE NOT NULL,
  data_competencia DATE,
  situacao VARCHAR NOT NULL DEFAULT 'ABERTA' CHECK (situacao IN ('ABERTA', 'PAGA', 'VENCIDA', 'CANCELADA')),
  observacoes TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  periodicidade VARCHAR CHECK (periodicidade IN ('UNICA', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
  recorrente BOOLEAN NOT NULL DEFAULT false,
  conta_origem_id UUID,
  numero_parcela INTEGER,
  total_parcelas INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para otimização
CREATE INDEX idx_contas_pagar_fornecedor ON public.contas_pagar(fornecedor_id);
CREATE INDEX idx_contas_pagar_vencimento ON public.contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_situacao ON public.contas_pagar(situacao);
CREATE INDEX idx_contas_pagar_competencia ON public.contas_pagar(data_competencia);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_contas_pagar_updated_at
  BEFORE UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY "Permitir acesso total para usuários autenticados - contas_pagar"
  ON public.contas_pagar
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Adicionar comentários na tabela
COMMENT ON TABLE public.contas_pagar IS 'Tabela para gerenciar contas a pagar';
COMMENT ON COLUMN public.contas_pagar.numero_documento IS 'Número do documento/nota fiscal';
COMMENT ON COLUMN public.contas_pagar.situacao IS 'Situação da conta: ABERTA, PAGA, VENCIDA, CANCELADA';
COMMENT ON COLUMN public.contas_pagar.periodicidade IS 'Periodicidade para contas recorrentes';
COMMENT ON COLUMN public.contas_pagar.recorrente IS 'Indica se a conta é recorrente';
COMMENT ON COLUMN public.contas_pagar.conta_origem_id IS 'ID da conta original para contas recorrentes';
COMMENT ON COLUMN public.contas_pagar.numero_parcela IS 'Número da parcela atual';
COMMENT ON COLUMN public.contas_pagar.total_parcelas IS 'Total de parcelas';
