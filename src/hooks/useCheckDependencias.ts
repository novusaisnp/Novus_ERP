import { useQuery } from '@tanstack/react-query';
import { dependenciasService } from '@/services/dependenciasService';
import type { CheckDependenciasResult } from '@/types/dependencias';

export function useCheckDependencias(entidade: string, id: string | null | undefined) {
  return useQuery<CheckDependenciasResult>({
    queryKey: ['check-dependencias', entidade, id],
    queryFn: () => dependenciasService.check(entidade, id as string),
    enabled: !!id && !!entidade,
    staleTime: 15_000,
  });
}
