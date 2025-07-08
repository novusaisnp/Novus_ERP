
-- Criar tabela para rateios de contas a pagar
CREATE TABLE public.rateios_contas_pagar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_pagar_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  plano_conta_id UUID NOT NULL REFERENCES public.plano_contas(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  valor NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para otimização
CREATE INDEX idx_rateios_contas_pagar_conta_pagar ON public.rateios_contas_pagar(conta_pagar_id);
CREATE INDEX idx_rateios_contas_pagar_plano_conta ON public.rateios_contas_pagar(plano_conta_id);
CREATE INDEX idx_rateios_contas_pagar_centro_custo ON public.rateios_contas_pagar(centro_custo_id);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_rateios_contas_pagar_updated_at
  BEFORE UPDATE ON public.rateios_contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.rateios_contas_pagar ENABLE ROW LEVEL SECURITY;

-- Criar política RLS
CREATE POLICY "Permitir acesso total para usuários autenticados - rateios_contas_pagar"
  ON public.rateios_contas_pagar
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Validação para garantir que apenas contas analíticas sejam usadas nos rateios
CREATE OR REPLACE FUNCTION validate_conta_analitica_rateio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar se a conta é analítica
    IF NOT EXISTS (
        SELECT 1 FROM public.plano_contas 
        WHERE id = NEW.plano_conta_id 
        AND analitica = true 
        AND ativo = true
    ) THEN
        RAISE EXCEPTION 'Apenas contas contábeis analíticas podem ser usadas em rateios';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Aplicar trigger de validação
CREATE TRIGGER validate_conta_analitica_rateio_trigger
  BEFORE INSERT OR UPDATE ON public.rateios_contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION validate_conta_analitica_rateio();

-- Comentários na tabela
COMMENT ON TABLE public.rateios_contas_pagar IS 'Tabela para armazenar rateios de contas a pagar entre diferentes contas contábeis e centros de custo';
COMMENT ON COLUMN public.rateios_contas_pagar.conta_pagar_id IS 'Referência para a conta a pagar principal';
COMMENT ON COLUMN public.rateios_contas_pagar.plano_conta_id IS 'Conta contábil analítica para o rateio';
COMMENT ON COLUMN public.rateios_contas_pagar.centro_custo_id IS 'Centro de custo para o rateio (opcional)';
COMMENT ON COLUMN public.rateios_contas_pagar.valor IS 'Valor monetário do rateio';
COMMENT ON COLUMN public.rateios_contas_pagar.percentual IS 'Percentual do rateio em relação ao valor total';
