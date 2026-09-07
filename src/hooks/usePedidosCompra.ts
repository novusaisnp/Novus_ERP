import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pedidoCompraService } from '@/services/pedidoCompraService';
import { useToast } from '@/hooks/use-toast';

export const usePedidosCompra = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pedidos = [], isLoading, error } = useQuery({
    queryKey: ['pedidos-compra'],
    queryFn: pedidoCompraService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });

  const gerarDaCotacaoMutation = useMutation({
    mutationFn: (cotacaoId: string) => pedidoCompraService.gerarDaCotacao(cotacaoId),
    onSuccess: (pedidos) => {
      invalidate();
      toast({ title: pedidos.length > 0 ? `${pedidos.length} pedido(s) gerado(s)` : 'Nenhum vencedor definido' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao gerar pedidos', description: error.message, variant: 'destructive' }),
  });

  const enviarParaAprovacaoMutation = useMutation({
    mutationFn: (pedidoId: string) => pedidoCompraService.enviarParaAprovacao(pedidoId),
    onSuccess: (resultado) => {
      invalidate();
      toast({
        title: resultado.status === 'APROVADO' ? 'Aprovado automaticamente' : 'Enviado para aprovação',
        description: resultado.status === 'APROVADO'
          ? 'Sem alçada configurada para esta categoria/valor — nenhuma aprovação exigida.'
          : 'Aguardando decisão de um aprovador com a alçada necessária.',
      });
    },
    onError: (error: Error) => toast({ title: 'Erro ao enviar para aprovação', description: error.message, variant: 'destructive' }),
  });

  const marcarEmitidoMutation = useMutation({
    mutationFn: (pedidoId: string) => pedidoCompraService.marcarEmitido(pedidoId),
    onSuccess: () => { invalidate(); toast({ title: 'Pedido marcado como emitido' }); },
    onError: (error: Error) => toast({ title: 'Erro ao marcar como emitido', description: error.message, variant: 'destructive' }),
  });

  const cancelarMutation = useMutation({
    mutationFn: (pedidoId: string) => pedidoCompraService.cancelar(pedidoId),
    onSuccess: () => { invalidate(); toast({ title: 'Pedido cancelado' }); },
    onError: (error: Error) => toast({ title: 'Erro ao cancelar pedido', description: error.message, variant: 'destructive' }),
  });

  return {
    pedidos,
    isLoading,
    error,
    gerarDaCotacao: gerarDaCotacaoMutation.mutateAsync,
    isGerando: gerarDaCotacaoMutation.isPending,
    enviarParaAprovacao: enviarParaAprovacaoMutation.mutateAsync,
    isEnviandoParaAprovacao: enviarParaAprovacaoMutation.isPending,
    marcarEmitido: marcarEmitidoMutation.mutateAsync,
    isMarcandoEmitido: marcarEmitidoMutation.isPending,
    cancelar: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
  };
};
