import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { movimentacoesService } from '@/services/movimentacoesService';
import type { 
  TituloFinanceiro, 
  LiquidacaoTitulo,
  EdicaoTitulo,
  CancelamentoTitulo,
  HistoricoMovimentacao
} from '@/types/movimentacoesFinanceiras';

export const useMovimentacoesCompletas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Hook para liquidação/baixa de títulos
  const liquidacaoMutation = useMutation({
    mutationFn: movimentacoesService.liquidarTitulo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      toast({
        title: 'Sucesso',
        description: 'Título liquidado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('[MovimentacoesCompletas] Erro ao liquidar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao liquidar título',
        variant: 'destructive',
      });
    },
  });

  // Hook para estorno de títulos
  const estornoMutation = useMutation({
    mutationFn: movimentacoesService.estornarTitulo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
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
    liquidarTitulo: liquidacaoMutation.mutate,
    estornarTitulo: estornoMutation.mutate,
    editarTitulo: edicaoMutation.mutate,
    cancelarTitulo: cancelamentoMutation.mutate,
    isLiquidando: liquidacaoMutation.isPending,
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
    uploadDocumento: uploadMutation.mutate,
    deleteDocumento: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};