import { useQuery } from '@tanstack/react-query';
import {
  fetchPermissoesFinanceiras,
  NENHUMA_PERMISSAO,
} from '@/services/permissoesFinanceirasService';
import type { PermissoesMovimentacao } from '@/types/movimentacoesFinanceiras';

/**
 * Capacidades financeiras do usuário atual.
 *
 * Enquanto carrega, ou se a consulta falhar, nada é liberado — negar por padrão.
 * Liberar na dúvida esconderia uma falha de autorização atrás de um botão visível.
 */
export function usePermissoesFinanceiras() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['permissoes-financeiras'],
    queryFn: fetchPermissoesFinanceiras,
    staleTime: 5 * 60 * 1000,
  });

  const permissoes: PermissoesMovimentacao = data ?? NENHUMA_PERMISSAO;

  return { permissoes, isLoading, error };
}
