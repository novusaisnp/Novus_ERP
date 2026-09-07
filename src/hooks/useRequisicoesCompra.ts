import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requisicaoCompraService } from '@/services/requisicaoCompraService';
import { useToast } from '@/hooks/use-toast';
import type { RequisicaoCompraInput } from '@/types/requisicaoCompra';

export const useRequisicoesCompra = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: requisicoes = [], isLoading, error } = useQuery({
    queryKey: ['requisicoes-compra'],
    queryFn: requisicaoCompraService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['requisicoes-compra'] });

  const criarMutation = useMutation({
    mutationFn: (input: RequisicaoCompraInput) => requisicaoCompraService.create(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Requisição enviada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao criar requisição', description: error.message, variant: 'destructive' }),
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => requisicaoCompraService.cancelar(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Requisição cancelada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao cancelar requisição', description: error.message, variant: 'destructive' }),
  });

  return {
    requisicoes,
    isLoading,
    error,
    criar: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    cancelar: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
  };
};
