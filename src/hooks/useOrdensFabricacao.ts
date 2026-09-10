import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordemFabricacaoService } from '@/services/ordemFabricacaoService';
import { useToast } from '@/hooks/use-toast';
import type { CriarOrdemFabricacaoInput, ConcluirOrdemFabricacaoInput } from '@/types/producao';

export const useOrdensFabricacao = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ordens = [], isLoading, error } = useQuery({
    queryKey: ['ordens-fabricacao'],
    queryFn: ordemFabricacaoService.list,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ordens-fabricacao'] });
    // Produção consome/gera estoque real — as telas de saldo/kardex precisam refletir.
    queryClient.invalidateQueries({ queryKey: ['estoque'] });
  };

  const criarMutation = useMutation({
    mutationFn: (input: CriarOrdemFabricacaoInput) => ordemFabricacaoService.criar(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ordem de fabricação aberta' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao abrir ordem de fabricação', description: error.message, variant: 'destructive' }),
  });

  const concluirMutation = useMutation({
    mutationFn: (input: ConcluirOrdemFabricacaoInput) => ordemFabricacaoService.concluir(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ordem de fabricação concluída' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao concluir ordem de fabricação', description: error.message, variant: 'destructive' }),
  });

  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => ordemFabricacaoService.cancelar(id, motivo),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Ordem de fabricação cancelada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao cancelar ordem de fabricação', description: error.message, variant: 'destructive' }),
  });

  return {
    ordens,
    isLoading,
    error,
    criar: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    concluir: concluirMutation.mutateAsync,
    isConcluindo: concluirMutation.isPending,
    cancelar: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
  };
};
