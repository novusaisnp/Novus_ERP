
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { centroCustoService } from '@/services/centroCustoService';
import { useToast } from '@/hooks/use-toast';

export const useCentrosCusto = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  console.log('[CentrosCusto] Hook inicializado');

  const {
    data: centrosCusto = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['centros-custo'],
    queryFn: centroCustoService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: centroCustoService.create,
    onSuccess: (data) => {
      console.log('[CentrosCusto] Centro criado com sucesso:', data);
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      toast({
        title: "Sucesso",
        description: `Centro de custo "${data.nome}" criado com sucesso`,
      });
    },
    onError: (error: Error) => {
      console.error('[CentrosCusto] Erro ao criar centro:', error);
      toast({
        title: "Erro ao criar centro de custo",
        description: error.message || "Erro interno do sistema",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      centroCustoService.update(id, data),
    onSuccess: (data) => {
      console.log('[CentrosCusto] Centro atualizado com sucesso:', data);
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      toast({
        title: "Sucesso",
        description: `Centro de custo "${data.nome}" atualizado com sucesso`,
      });
    },
    onError: (error: Error) => {
      console.error('[CentrosCusto] Erro ao atualizar centro:', error);
      toast({
        title: "Erro ao atualizar centro de custo",
        description: error.message || "Erro interno do sistema",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: centroCustoService.delete,
    onSuccess: () => {
      console.log('[CentrosCusto] Centro excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] });
      toast({
        title: "Sucesso",
        description: "Centro de custo excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      console.error('[CentrosCusto] Erro ao excluir centro:', error);
      toast({
        title: "Erro ao excluir centro de custo",
        description: error.message || "Erro interno do sistema",
        variant: "destructive",
      });
    },
  });

  return {
    centrosCusto,
    isLoading,
    error,
    criar: createMutation.mutateAsync,
    atualizar: updateMutation.mutateAsync,
    excluir: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
