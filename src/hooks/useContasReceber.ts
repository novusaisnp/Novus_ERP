
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { contasReceberService } from '@/services/contasReceberService';
import type { Paginacao } from '@/services/contasReceber/contasReceberQueries';
import type { ContaReceber, ContaReceberInput, ContaReceberFilters } from '@/types/contasReceber';

export const useContasReceber = (filtros: ContaReceberFilters = {}, paginacao?: Paginacao) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: contasReceberResult,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['contas-receber', filtros, paginacao],
    queryFn: async () => {
      try {
        return await contasReceberService.getAll(filtros, paginacao);
      } catch (error) {
        console.error('[UseContasReceber] Erro ao buscar contas:', error);
        // Retornar vazio em caso de erro para evitar crash
        return { data: [], total: 0 };
      }
    },
    retry: 1, // Tentar apenas uma vez para evitar loop de erros
  });
  const contasReceber = contasReceberResult?.data ?? [];
  const total = contasReceberResult?.total ?? 0;

  const {
    data: estatisticas,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['contas-receber-stats', filtros],
    queryFn: async () => {
      try {
        return await contasReceberService.getEstatisticas(filtros);
      } catch (error) {
        console.error('[UseContasReceber] Erro ao buscar estatísticas:', error);
        // Retornar estatísticas zeradas em caso de erro
        return {
          total_contas: 0,
          contas_abertas: 0,
          contas_vencidas: 0,
          contas_recebidas: 0,
          valor_total_aberto: 0,
          valor_total_vencido: 0,
          valor_total_recebido: 0,
        };
      }
    },
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: contasReceberService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-stats'] });
      toast({
        title: 'Sucesso',
        description: 'Conta a receber criada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[UseContasReceber] Erro ao criar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar conta a receber',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContaReceberInput }) =>
      contasReceberService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-stats'] });
      toast({
        title: 'Sucesso',
        description: 'Conta a receber atualizada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[UseContasReceber] Erro ao atualizar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar conta a receber',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contasReceberService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-stats'] });
      toast({
        title: 'Sucesso',
        description: 'Conta a receber removida com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[UseContasReceber] Erro ao remover:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover conta a receber',
        variant: 'destructive',
      });
    },
  });

  return {
    contasReceber,
    total,
    estatisticas,
    isLoading,
    isFetching,
    isLoadingStats,
    error,
    criar: createMutation.mutate,
    atualizar: updateMutation.mutate,
    remover: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

export const useContaReceber = (id: string) => {
  const { toast } = useToast();

  const {
    data: conta,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conta-receber', id],
    queryFn: async () => {
      try {
        return await contasReceberService.getById(id);
      } catch (error) {
        console.error('[UseContaReceber] Erro ao buscar conta:', error);
        return null;
      }
    },
    enabled: !!id,
    retry: 1,
  });

  return {
    conta,
    isLoading,
    error,
  };
};
