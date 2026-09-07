import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { alcadasAprovacaoService, alcadasSubstitutosService } from '@/services/alcadasService';
import { useToast } from '@/hooks/use-toast';
import type { AlcadaAprovacaoInput, AlcadaSubstitutoInput } from '@/types/alcadas';

export const useAlcadas = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alcadas = [], isLoading, error } = useQuery({
    queryKey: ['alcadas-aprovacao'],
    queryFn: alcadasAprovacaoService.list,
  });

  const { data: substitutos = [], isLoading: isLoadingSubstitutos } = useQuery({
    queryKey: ['alcadas-substitutos'],
    queryFn: alcadasSubstitutosService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['alcadas-aprovacao'] });
  const invalidateSubstitutos = () => queryClient.invalidateQueries({ queryKey: ['alcadas-substitutos'] });

  const createMutation = useMutation({
    mutationFn: (input: AlcadaAprovacaoInput) => alcadasAprovacaoService.create(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Alçada cadastrada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao cadastrar alçada', description: error.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AlcadaAprovacaoInput> }) => alcadasAprovacaoService.update(id, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Alçada atualizada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao atualizar alçada', description: error.message, variant: 'destructive' }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => alcadasAprovacaoService.remove(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Alçada removida' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao remover alçada', description: error.message, variant: 'destructive' }),
  });

  const createSubstitutoMutation = useMutation({
    mutationFn: (input: AlcadaSubstitutoInput) => alcadasSubstitutosService.create(input),
    onSuccess: () => {
      invalidateSubstitutos();
      toast({ title: 'Substituição registrada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao registrar substituição', description: error.message, variant: 'destructive' }),
  });

  const removeSubstitutoMutation = useMutation({
    mutationFn: (id: string) => alcadasSubstitutosService.remove(id),
    onSuccess: () => {
      invalidateSubstitutos();
      toast({ title: 'Substituição removida' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao remover substituição', description: error.message, variant: 'destructive' }),
  });

  return {
    alcadas,
    isLoading,
    error,
    criar: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    atualizar: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remover: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    substitutos,
    isLoadingSubstitutos,
    criarSubstituto: createSubstitutoMutation.mutateAsync,
    isCreatingSubstituto: createSubstitutoMutation.isPending,
    removerSubstituto: removeSubstitutoMutation.mutateAsync,
    isRemovingSubstituto: removeSubstitutoMutation.isPending,
  };
};
