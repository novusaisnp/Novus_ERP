import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recebimentoCompraService } from '@/services/recebimentoCompraService';
import { useToast } from '@/hooks/use-toast';
import type { ConfirmarRecebimentoItemInput } from '@/types/recebimentoCompra';

export const useRecebimentosCompra = (pedidoId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: recebimentos = [], isLoading } = useQuery({
    queryKey: ['recebimentos-compra', pedidoId],
    queryFn: () => recebimentoCompraService.listByPedido(pedidoId as string),
    enabled: !!pedidoId,
  });

  const confirmarMutation = useMutation({
    mutationFn: ({ itens, observacoes }: { itens: ConfirmarRecebimentoItemInput[]; observacoes?: string }) =>
      recebimentoCompraService.confirmar(pedidoId as string, itens, observacoes),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['recebimentos-compra', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-compra'] });
      toast({
        title: 'Recebimento confirmado',
        description: resultado.pedido_completo
          ? 'Pedido 100% recebido — título a pagar gerado automaticamente.'
          : 'Recebimento parcial registrado. Ainda falta receber itens deste pedido.',
      });
    },
    onError: (error: Error) => toast({ title: 'Erro ao confirmar recebimento', description: error.message, variant: 'destructive' }),
  });

  return {
    recebimentos,
    isLoading,
    confirmar: confirmarMutation.mutateAsync,
    isConfirmando: confirmarMutation.isPending,
  };
};
