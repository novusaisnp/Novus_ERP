// P12: Hook para obter empresa atual do usuário
import { useQuery } from '@tanstack/react-query';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

export function useEmpresaAtual() {
  return useQuery({
    queryKey: ['user-empresa-atual'],
    queryFn: getEmpresaAtivaId,
    staleTime: 5 * 60_000,
  });
}
