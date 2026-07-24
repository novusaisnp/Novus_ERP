
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  listarBancos,
  buscarBancos,
  criarBanco,
  atualizarBanco,
  arquivarBanco,
  restaurarBanco,
  obterEstatisticasBancos,
} from '@/services/bancoService';
import { BancoInput } from '@/types/banco';

console.log('[Bancos] Hook useBancos carregado');

export const useBancos = (filtros?: {
  codigo?: string;
  nome?: string;
  pais?: string;
  ativo?: boolean;
  incluirArquivados?: boolean;
}) => {
  const queryClient = useQueryClient();

  // Query para listar bancos
  const {
    data: bancos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bancos', filtros],
    queryFn: () => filtros ? buscarBancos(filtros) : listarBancos(),
  });

  // Query para estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ['bancos-estatisticas'],
    queryFn: obterEstatisticasBancos,
  });

  // Mutation para criar banco
  const criarMutation = useMutation({
    mutationFn: criarBanco,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Banco criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Bancos] Erro ao criar banco:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar banco',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar banco
  const atualizarMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BancoInput> }) =>
      atualizarBanco(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Banco atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Bancos] Erro ao atualizar banco:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar banco',
        variant: 'destructive',
      });
    },
  });

  // Mutation para arquivar banco
  const arquivarMutation = useMutation({
    mutationFn: arquivarBanco,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Banco arquivado com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Bancos] Erro ao arquivar banco:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao arquivar banco',
        variant: 'destructive',
      });
    },
  });

  // Mutation para restaurar banco
  const restaurarMutation = useMutation({
    mutationFn: restaurarBanco,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bancos'] });
      queryClient.invalidateQueries({ queryKey: ['bancos-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Banco restaurado com sucesso!',
      });
    },
    onError: (error: Error) => {
      console.error('[Bancos] Erro ao restaurar banco:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao restaurar banco',
        variant: 'destructive',
      });
    },
  });

  return {
    bancos,
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
