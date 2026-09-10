import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { movimentacoesService } from '@/services/movimentacoesService';
import { qk } from '@/lib/queryKeys';
import type {
  TituloFinanceiro,
  LiquidacaoTitulo,
  EdicaoTitulo,
  CancelamentoTitulo,
  HistoricoMovimentacao
} from '@/types/movimentacoesFinanceiras';

// [LOTE 3B] Invalidação refinada por tipo do título; evita refetch amplo.
const invalidarPorTipo = (queryClient: ReturnType<typeof useQueryClient>, tipo?: string, contaId?: string) => {
  queryClient.invalidateQueries({ queryKey: qk.movimentacoesFinanceiras.all });
  if (tipo === 'CONTAS_PAGAR') {
    queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
    queryClient.invalidateQueries({ queryKey: qk.contasPagar.stats() });
  } else if (tipo === 'CONTAS_RECEBER') {
    queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
    queryClient.invalidateQueries({ queryKey: qk.contasReceber.stats() });
  } else {
    // Fallback: sem tipo, invalida ambos (mantém compat)
    queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
    queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
  }
  if (contaId) {
    queryClient.invalidateQueries({ queryKey: qk.contasBancarias.detail(contaId) });
    queryClient.invalidateQueries({ queryKey: qk.contasBancarias.stats() });
  }
};

export const useMovimentacoesCompletas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // [LOTE 3B.1] Liquidação removida deste hook — caminho único e canônico é
  // `LiquidacaoTituloModal`, que dispara `movimentacoesService.liquidarTitulo`
  // com sua própria mutation e invalidação refinada. Manter apenas um caminho
  // evita mutations duplicadas e divergência de cache.


  // Hook para estorno de títulos
  const estornoMutation = useMutation({
    mutationFn: movimentacoesService.estornarLiquidacao,
    onSuccess: (_data, variables: any) => {
      invalidarPorTipo(queryClient, variables?.tipo_titulo);
      toast({
        title: 'Sucesso',
        description: 'Título estornado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[MovimentacoesCompletas] Erro ao estornar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao estornar título',
        variant: 'destructive',
      });
    },
  });

  // Hook para edição de títulos
  const edicaoMutation = useMutation({
    mutationFn: movimentacoesService.editarTitulo,
    onSuccess: (_data, variables: EdicaoTitulo) => {
      invalidarPorTipo(queryClient, variables?.tipo_titulo);
      toast({
        title: 'Sucesso',
        description: 'Título editado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[MovimentacoesCompletas] Erro ao editar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao editar título',
        variant: 'destructive',
      });
    },
  });

  // Hook para cancelamento de títulos
  const cancelamentoMutation = useMutation({
    mutationFn: movimentacoesService.cancelarTitulo,
    onSuccess: (_data, variables: CancelamentoTitulo) => {
      invalidarPorTipo(queryClient, variables?.tipo_titulo);
      toast({
        title: 'Sucesso',
        description: 'Título cancelado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[MovimentacoesCompletas] Erro ao cancelar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cancelar título',
        variant: 'destructive',
      });
    },
  });

  return {
    // liquidarTitulo removido: usar `LiquidacaoTituloModal` (caminho único).
    estornarTitulo: estornoMutation.mutate,
    editarTitulo: edicaoMutation.mutate,
    cancelarTitulo: cancelamentoMutation.mutate,
    isEstornando: estornoMutation.isPending,
    isEditando: edicaoMutation.isPending,
    isCancelando: cancelamentoMutation.isPending,
  };
};


// Hook para buscar histórico de movimentações
export const useHistoricoMovimentacoes = (tituloId: string, tipoTitulo: string) => {
  return useQuery({
    queryKey: ['historico-movimentacoes', tituloId, tipoTitulo],
    queryFn: () => movimentacoesService.getHistoricoMovimentacoes(tituloId, tipoTitulo),
    enabled: !!tituloId && !!tipoTitulo,
    retry: 1,
  });
};

// Hook para buscar rateios do título
export const useRateiosTitulo = (tituloId: string, tipoTitulo: string) => {
  return useQuery({
    queryKey: ['rateios-titulo', tituloId, tipoTitulo],
    queryFn: () => movimentacoesService.getRateiosTitulo(tituloId, tipoTitulo),
    enabled: !!tituloId && !!tipoTitulo,
    retry: 1,
    refetchOnWindowFocus: true, // Força refresh quando a janela recebe foco
    staleTime: 0, // Sempre considera os dados obsoletos para forçar nova busca
  });
};

// Hook para buscar documentos do título
export const useDocumentosTitulo = (tituloId: string, tipoTitulo: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: documentos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['documentos-titulo', tituloId, tipoTitulo],
    queryFn: () => movimentacoesService.getDocumentosTitulo(tituloId, tipoTitulo),
    enabled: !!tituloId && !!tipoTitulo,
    retry: 1,
  });

  const uploadMutation = useMutation({
    mutationFn: movimentacoesService.uploadDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-titulo', tituloId, tipoTitulo] });
      toast({
        title: 'Sucesso',
        description: 'Documento enviado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[DocumentosTitulo] Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar documento',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: movimentacoesService.deleteDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-titulo', tituloId, tipoTitulo] });
      toast({
        title: 'Sucesso',
        description: 'Documento removido com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[DocumentosTitulo] Erro ao remover:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao remover documento',
        variant: 'destructive',
      });
    },
  });

  return {
    documentos,
    isLoading,
    error,
    // mutateAsync (não mutate): o form de upload e o diálogo de exclusão fazem `await` na
    // chamada e só fecham/resetam depois — com `mutate` (fire-and-forget) o `await` não
    // esperava nada de verdade, então a UI assumia sucesso antes da mutation terminar.
    uploadDocumento: uploadMutation.mutateAsync,
    deleteDocumento: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
