import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  listarMovimentacoesBancarias,
  obterMovimentacaoBancaria,
  criarMovimentacaoBancaria,
  realizarTransferenciaBancaria,
  estornarMovimentacao,
  conciliarMovimentacao,
  obterEstatisticasMovimentacoes,
  obterHistoricoMovimentacao,
  obterDocumentosMovimentacao,
  atualizarMovimentacaoBancaria,
  excluirMovimentacaoBancaria,
} from '@/services/movimentacoesBancariasService';
import {
  FiltrosMovimentacoes,
  MovimentacaoBancariaInput,
  TransferenciaBancaria,
  EstornoMovimentacao,
  ConciliacaoMovimentacao,
} from '@/types/movimentacoesBancarias';


export const useMovimentacoesBancarias = (filtros?: FiltrosMovimentacoes) => {
  const queryClient = useQueryClient();

  // Query para listar movimentações
  const {
    data: movimentacoes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['movimentacoes-bancarias', filtros],
    queryFn: () => listarMovimentacoesBancarias(filtros),
  });

  // Query para estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: ['movimentacoes-bancarias-estatisticas', filtros],
    queryFn: () => obterEstatisticasMovimentacoes(filtros),
  });

  // Mutation para criar movimentação
  const criarMutation = useMutation({
    mutationFn: criarMovimentacaoBancaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }); // Atualizar saldos
      toast({
        title: 'Sucesso',
        description: 'Movimentação criada com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('[MovimentacoesBancarias] Erro ao criar movimentação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar movimentação',
        variant: 'destructive',
      });
    },
  });

  // Mutation para transferência
  const transferenciaMutation = useMutation({
    mutationFn: realizarTransferenciaBancaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }); // Atualizar saldos
      toast({
        title: 'Sucesso',
        description: 'Transferência realizada com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('[MovimentacoesBancarias] Erro ao realizar transferência:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao realizar transferência',
        variant: 'destructive',
      });
    },
  });

  // Mutation para estorno
  const estornoMutation = useMutation({
    mutationFn: estornarMovimentacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }); // Atualizar saldos
      toast({
        title: 'Sucesso',
        description: 'Movimentação estornada com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('[MovimentacoesBancarias] Erro ao estornar movimentação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao estornar movimentação',
        variant: 'destructive',
      });
    },
  });

  // Mutation para conciliação
  const conciliacaoMutation = useMutation({
    mutationFn: conciliarMovimentacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias-estatisticas'] });
      toast({
        title: 'Sucesso',
        description: 'Movimentação conciliada com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('[MovimentacoesBancarias] Erro ao conciliar movimentação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao conciliar movimentação',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar
  const atualizarMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MovimentacaoBancariaInput> }) =>
      atualizarMovimentacaoBancaria(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }); // Atualizar saldos
      toast({
        title: 'Sucesso',
        description: 'Movimentação atualizada com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('[MovimentacoesBancarias] Erro ao atualizar movimentação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar movimentação',
        variant: 'destructive',
      });
    },
  });

  // Mutation para excluir
  const excluirMutation = useMutation({
    mutationFn: excluirMovimentacaoBancaria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-bancarias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] }); // Atualizar saldos
      toast({
        title: 'Sucesso',
        description: 'Movimentação excluída com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('[MovimentacoesBancarias] Erro ao excluir movimentação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir movimentação',
        variant: 'destructive',
      });
    },
  });

  return {
    movimentacoes,
    estatisticas,
    isLoading,
    error,
    refetch,
    criar: criarMutation.mutate,
    realizarTransferencia: transferenciaMutation.mutate,
    estornar: estornoMutation.mutate,
    conciliar: conciliacaoMutation.mutate,
    atualizar: atualizarMutation.mutate,
    excluir: excluirMutation.mutate,
    isCreating: criarMutation.isPending,
    isTransferring: transferenciaMutation.isPending,
    isEstorning: estornoMutation.isPending,
    isConciliating: conciliacaoMutation.isPending,
    isUpdating: atualizarMutation.isPending,
    isDeleting: excluirMutation.isPending,
  };
};

// Hook para obter uma movimentação específica
export const useMovimentacaoBancaria = (id: string) => {
  return useQuery({
    queryKey: ['movimentacao-bancaria', id],
    queryFn: () => obterMovimentacaoBancaria(id),
    enabled: !!id,
  });
};

// Hook para histórico de movimentação
export const useHistoricoMovimentacao = (movimentacaoId: string) => {
  return useQuery({
    queryKey: ['historico-movimentacao', movimentacaoId],
    queryFn: () => obterHistoricoMovimentacao(movimentacaoId),
    enabled: !!movimentacaoId,
  });
};

// Hook para documentos de movimentação
export const useDocumentosMovimentacao = (movimentacaoId: string) => {
  return useQuery({
    queryKey: ['documentos-movimentacao', movimentacaoId],
    queryFn: () => obterDocumentosMovimentacao(movimentacaoId),
    enabled: !!movimentacaoId,
  });
};