-- Correção: `categoria_padrao` (20260829120000) tinha 'pedagogico' na lista de valores
-- válidos -- vocabulário do vertical educacional vazando pro schema do ERP, que é
-- transversal por princípio (mesmo motivo documentado na skill erp-satellite-integration/
-- memória feedback_satellite_generic_contracts: o ERP nunca deve saber o vocabulário de
-- role de um satélite específico). Substitui por 'atendimento_operacional' -- "quem
-- entrega o trabalho-fim do negócio representado, seja qual for" (professor numa escola,
-- vendedor num PDV futuro, atendente numa clínica etc.), sem amarrar a nenhum vertical.
ALTER TABLE public.cargos
  DROP CONSTRAINT cargos_categoria_padrao_check;

UPDATE public.cargos SET categoria_padrao = 'atendimento_operacional' WHERE categoria_padrao = 'pedagogico';

ALTER TABLE public.cargos
  ADD CONSTRAINT cargos_categoria_padrao_check
  CHECK (categoria_padrao IN (
    'atendimento_operacional', 'coordenacao_administrativa', 'administrativo',
    'financeiro', 'diretoria', 'outro'
  ));
