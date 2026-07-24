
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  listarAgencias,
  criarAgencia,
  atualizarAgencia,
  arquivarAgencia,
  restaurarAgencia,
  obterEstatisticasAgencias,
  buscarAgenciasPorBanco,
} from '@/services/agenciaService';
import { AgenciaInput, AgenciaFilters } from '@/types/agencia';

console.log('[Agencias] Hook useAgencias carregado');

export const useAgencias = (filtros?: AgenciaFilters) => {
  const queryClient = useQueryClient();

  // Query para listar agências
  const {
    data: agencias = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agencias', filtros],
    queryFn: () => listarAgencias(filtros),
  });

  // Query para estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ['agencias-estatisticas'],
    queryFn: obterEstatisticasAgencias,
  });

  // Mutation para criar agência
  const criarMutation = useMutation({
    mutationFn: criarAgencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      queryClient.invalidateQueries({ queryKey: ['agencias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Agência criada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Agencias] Erro ao criar agência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar agência',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar agência
  const atualizarMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AgenciaInput> }) =>
      atualizarAgencia(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      queryClient.invalidateQueries({ queryKey: ['agencias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Agência atualizada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Agencias] Erro ao atualizar agência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar agência',
        variant: 'destructive',
      });
    },
  });

  // Mutation para arquivar agência
  const arquivarMutation = useMutation({
    mutationFn: arquivarAgencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      queryClient.invalidateQueries({ queryKey: ['agencias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Agência arquivada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Agencias] Erro ao arquivar agência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao arquivar agência',
        variant: 'destructive',
      });
    },
  });

  // Mutation para restaurar agência
  const restaurarMutation = useMutation({
    mutationFn: restaurarAgencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencias'] });
      queryClient.invalidateQueries({ queryKey: ['agencias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Agência restaurada com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Agencias] Erro ao restaurar agência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao restaurar agência',
        variant: 'destructive',
      });
    },
  });

  // Query para buscar agências por banco
  const useBuscarPorBanco = (bancoId: string) =>
    useQuery({
      queryKey: ['agencias-banco', bancoId],
      queryFn: () => buscarAgenciasPorBanco(bancoId),
      enabled: !!bancoId,
    });

  return {
    agencias,
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
    useBuscarPorBanco,
  };
};
