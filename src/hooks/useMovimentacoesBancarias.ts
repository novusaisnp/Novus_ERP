import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
  MovimentacaoBancaria,
} from '@/types/movimentacoesBancarias';
import { qk } from '@/lib/queryKeys';
import { mapBankingError } from '@/lib/bankingErrors';

// [LOTE 3C] Invalidação refinada:
// - Com contaId conhecido: apenas detail(id) + stats() (+ raiz movimentacoes)
// - Sem contaId: fallback para contasBancarias.all
// stats() agora descende de movimentacoesBancarias.all, então invalidar
// a raiz cobre stats por prefix match.
const invalidarMovBancarias = (queryClient: QueryClient, contaIds: Array<string | undefined | null>) => {
  queryClient.invalidateQueries({ queryKey: qk.movimentacoesBancarias.all });

  const unique = Array.from(new Set(contaIds.filter((v): v is string => !!v)));
  if (unique.length > 0) {
    unique.forEach((id) => {
      queryClient.invalidateQueries({ queryKey: qk.contasBancarias.detail(id) });
    });
    queryClient.invalidateQueries({ queryKey: qk.contasBancarias.stats() });
  } else {
    // Fallback: sem id conhecido, invalida a raiz para manter listas coerentes.
    queryClient.invalidateQueries({ queryKey: qk.contasBancarias.all });
  }
};

const notifyBankingError = (err: unknown, fallbackTitle: string, logTag: string) => {
  console.error(`[MovimentacoesBancarias] ${logTag}:`, err);
  const { title, description } = mapBankingError(err, fallbackTitle);
  toast({ title, description, variant: 'destructive' });
};



export const useMovimentacoesBancarias = (filtros?: FiltrosMovimentacoes) => {
  const queryClient = useQueryClient();

  // Query para listar movimentações
  const {
    data: movimentacoes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: qk.movimentacoesBancarias.list(filtros),
    queryFn: () => listarMovimentacoesBancarias(filtros),
  });

  // Query para estatísticas
  const { data: estatisticas } = useQuery({
    queryKey: qk.movimentacoesBancarias.stats(filtros),
    queryFn: () => obterEstatisticasMovimentacoes(filtros),
  });

  // Mutation para criar movimentação
  const criarMutation = useMutation({
    mutationFn: criarMovimentacaoBancaria,
    onSuccess: (data: MovimentacaoBancaria, variables: MovimentacaoBancariaInput) => {
      invalidarMovBancarias(queryClient, [data?.conta_bancaria_id, variables?.conta_bancaria_id, variables?.conta_destino_id]);
      toast({
        title: 'Sucesso',
        description: 'Movimentação criada com sucesso!',
      });
    },
    onError: (error: unknown) => {
      notifyBankingError(error, 'Erro ao criar movimentação', 'Erro ao criar movimentação');
    },
  });

  // Mutation para transferência
  const transferenciaMutation = useMutation({
    mutationFn: realizarTransferenciaBancaria,
    onSuccess: (_data, variables) => {
      invalidarMovBancarias(queryClient, [variables?.conta_origem_id, variables?.conta_destino_id]);
      toast({
        title: 'Sucesso',
        description: 'Transferência realizada com sucesso!',
      });
    },
    onError: (error: unknown) => {
      notifyBankingError(error, 'Erro ao realizar transferência', 'Erro ao realizar transferência');
    },
  });

  // Mutation para estorno
  const estornoMutation = useMutation({
    mutationFn: estornarMovimentacao,
    onSuccess: (data: MovimentacaoBancaria) => {
      invalidarMovBancarias(queryClient, [data?.conta_bancaria_id, data?.conta_destino_id]);
      toast({
        title: 'Sucesso',
        description: 'Movimentação estornada com sucesso!',
      });
    },
    onError: (error: unknown) => {
      notifyBankingError(error, 'Erro ao estornar movimentação', 'Erro ao estornar movimentação');
    },
  });

  // Mutation para conciliação
  const conciliacaoMutation = useMutation({
    mutationFn: conciliarMovimentacao,
    onSuccess: () => {
      // Sem contaId — invalida raiz de movimentações (cobre stats por prefix match)
      invalidarMovBancarias(queryClient, []);
      toast({
        title: 'Sucesso',
        description: 'Movimentação conciliada com sucesso!',
      });
    },
    onError: (error: unknown) => {
      notifyBankingError(error, 'Erro ao conciliar movimentação', 'Erro ao conciliar movimentação');
    },
  });

  // Mutation para atualizar
  const atualizarMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<MovimentacaoBancariaInput> }) =>
      atualizarMovimentacaoBancaria(id, input),
    onSuccess: (data: MovimentacaoBancaria, variables) => {
      invalidarMovBancarias(queryClient, [data?.conta_bancaria_id, variables?.input?.conta_bancaria_id]);
      toast({
        title: 'Sucesso',
        description: 'Movimentação atualizada com sucesso!',
      });
    },
    onError: (error: unknown) => {
      notifyBankingError(error, 'Erro ao atualizar movimentação', 'Erro ao atualizar movimentação');
    },
  });

  // Mutation para excluir
  const excluirMutation = useMutation({
    mutationFn: excluirMovimentacaoBancaria,
    onSuccess: () => {
      // Sem contaId disponível — invalida escopo bancário sem broad em pagar/receber
      invalidarMovBancarias(queryClient, []);
      toast({
        title: 'Sucesso',
        description: 'Movimentação excluída com sucesso!',
      });
    },
    onError: (error: unknown) => {
      notifyBankingError(error, 'Erro ao excluir movimentação', 'Erro ao excluir movimentação');
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