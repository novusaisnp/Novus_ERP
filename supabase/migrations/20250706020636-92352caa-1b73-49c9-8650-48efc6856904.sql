
-- Adicionar coluna 'analitica' na tabela plano_contas
ALTER TABLE public.plano_contas 
ADD COLUMN analitica BOOLEAN NOT NULL DEFAULT true;

-- Atualizar contas existentes: contas com filhos são sintéticas (false), sem filhos são analíticas (true)
UPDATE public.plano_contas 
SET analitica = CASE 
    WHEN id IN (
        SELECT DISTINCT id_pai 
        FROM public.plano_contas 
        WHERE id_pai IS NOT NULL
    ) THEN false
    ELSE true
END;

-- Criar função para automaticamente atualizar o campo analitica quando houver mudanças
CREATE OR REPLACE FUNCTION public.update_conta_analitica()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando uma conta recebe um filho, ela se torna sintética
    IF TG_OP = 'INSERT' AND NEW.id_pai IS NOT NULL THEN
        UPDATE public.plano_contas 
        SET analitica = false 
        WHERE id = NEW.id_pai;
    END IF;
    
    -- Quando uma conta perde todos os filhos, ela pode se tornar analítica
    IF TG_OP = 'DELETE' AND OLD.id_pai IS NOT NULL THEN
        UPDATE public.plano_contas 
        SET analitica = CASE 
            WHEN (SELECT COUNT(*) FROM public.plano_contas WHERE id_pai = OLD.id_pai) = 0 
            THEN true 
            ELSE false 
        END
        WHERE id = OLD.id_pai;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para manter consistência automática
CREATE TRIGGER trigger_update_conta_analitica
    AFTER INSERT OR DELETE ON public.plano_contas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_conta_analitica();

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.plano_contas.analitica IS 'Define se a conta é analítica (true - pode receber lançamentos) ou sintética (false - apenas agrupadora)';
