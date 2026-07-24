
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  listarContasBancarias,
  criarContaBancaria,
  atualizarContaBancaria,
  arquivarContaBancaria,
  restaurarContaBancaria,
  obterEstatisticasContasBancarias,
} from '@/services/contaBancariaService';
import { ContaBancariaInput, ContaBancariaFilters } from '@/types/contaBancaria';

console.log('[ContasBancarias] Hook useContasBancarias carregado');

export const useContasBancarias = (filtros?: ContaBancariaFilters) => {
  const queryClient = useQueryClient();

  // Query para listar contas bancárias
  const {
    data: contasBancarias = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contas-bancarias', filtros],
    queryFn: () => listarContasBancarias(filtros),
  });

  // Query para estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ['contas-bancarias-estatisticas'],
    queryFn: obterEstatisticasContasBancarias,
  });

  // Mutation para criar conta bancária
  const criarMutation = useMutation({
    mutationFn: criarContaBancaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária criada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[ContasBancarias] Erro ao criar conta bancária:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar conta bancária',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar conta bancária
  const atualizarMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ContaBancariaInput> }) =>
      atualizarContaBancaria(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária atualizada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[ContasBancarias] Erro ao atualizar conta bancária:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar conta bancária',
        variant: 'destructive',
      });
    },
  });

  // Mutation para arquivar conta bancária
  const arquivarMutation = useMutation({
    mutationFn: arquivarContaBancaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária arquivada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[ContasBancarias] Erro ao arquivar conta bancária:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao arquivar conta bancária',
        variant: 'destructive',
      });
    },
  });

  // Mutation para restaurar conta bancária
  const restaurarMutation = useMutation({
    mutationFn: restaurarContaBancaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Conta bancária restaurada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[ContasBancarias] Erro ao restaurar conta bancária:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao restaurar conta bancária',
        variant: 'destructive',
      });
    },
  });

  return {
    contasBancarias,
    estatisticas,
    isLoading,
    error,
    refetch,
    criar: criarMutation.mutate,
    atualizar: atualizarMutation.mutate,
    arquivar: arquivarMutation.mutate,
    restaurar: restaurarMutation.mutate,
    isCreating: criarMutation.isPending,
    isUpdating: atualizarMutation.isPending,
    isArchiving: arquivarMutation.isPending,
    isRestoring: restaurarMutation.isPending,
  };
};
