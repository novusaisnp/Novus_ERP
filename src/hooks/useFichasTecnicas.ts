import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fichaTecnicaService } from '@/services/fichaTecnicaService';
import { useToast } from '@/hooks/use-toast';
import type { FichaTecnicaInput } from '@/types/producao';

export const useFichasTecnicas = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: fichasTecnicas = [], isLoading, error } = useQuery({
    queryKey: ['fichas-tecnicas'],
    queryFn: fichaTecnicaService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fichas-tecnicas'] });

  const criarMutation = useMutation({
    mutationFn: (input: FichaTecnicaInput) => fichaTecnicaService.create(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ficha técnica criada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao criar ficha técnica', description: error.message, variant: 'destructive' }),
  });

  const desativarMutation = useMutation({
    mutationFn: (id: string) => fichaTecnicaService.desativar(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ficha técnica desativada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao desativar ficha técnica', description: error.message, variant: 'destructive' }),
  });

  return {
    fichasTecnicas,
    isLoading,
    error,
    criar: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    desativar: desativarMutation.mutateAsync,
    isDesativando: desativarMutation.isPending,
  };
};
