import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cotacaoCompraService } from '@/services/cotacaoCompraService';
import { useToast } from '@/hooks/use-toast';
import type { CotacaoCompraInput, RegistrarPrecoInput } from '@/types/cotacaoCompra';

export const useCotacoesCompra = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cotacoes = [], isLoading, error } = useQuery({
    queryKey: ['cotacoes-compra'],
    queryFn: cotacaoCompraService.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cotacoes-compra'] });

  const criarMutation = useMutation({
    mutationFn: (input: CotacaoCompraInput) => cotacaoCompraService.create(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Cotação criada' });
    },
    onError: (error: Error) => toast({ title: 'Erro ao criar cotação', description: error.message, variant: 'destructive' }),
  });

  return {
    cotacoes,
    isLoading,
    error,
    criar: criarMutation.mutateAsync,
    isCriando: criarMutation.isPending,
  };
};

export const useCotacaoCompra = (id: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cotacao, isLoading, error } = useQuery({
    queryKey: ['cotacao-compra', id],
    queryFn: () => cotacaoCompraService.get(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['cotacao-compra', id] });
    queryClient.invalidateQueries({ queryKey: ['cotacoes-compra'] });
  };

  const convidarMutation = useMutation({
    mutationFn: (fornecedorId: string) => cotacaoCompraService.convidarFornecedor(id!, fornecedorId),
    onSuccess: () => { invalidate(); toast({ title: 'Fornecedor convidado' }); },
    onError: (error: Error) => toast({ title: 'Erro ao convidar fornecedor', description: error.message, variant: 'destructive' }),
  });

  const removerFornecedorMutation = useMutation({
    mutationFn: (convidadoId: string) => cotacaoCompraService.removerFornecedor(convidadoId),
    onSuccess: () => { invalidate(); toast({ title: 'Fornecedor removido' }); },
    onError: (error: Error) => toast({ title: 'Erro ao remover fornecedor', description: error.message, variant: 'destructive' }),
  });

  const registrarPrecoMutation = useMutation({
    mutationFn: (input: RegistrarPrecoInput) => cotacaoCompraService.registrarPreco(input),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast({ title: 'Erro ao registrar preço', description: error.message, variant: 'destructive' }),
  });

  const marcarVencedorMutation = useMutation({
    mutationFn: ({ precoId, itemId }: { precoId: string; itemId: string }) =>
      cotacaoCompraService.marcarVencedor(precoId, itemId, id!),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast({ title: 'Erro ao marcar vencedor', description: error.message, variant: 'destructive' }),
  });

  const fecharMutation = useMutation({
    mutationFn: () => cotacaoCompraService.fechar(id!),
    onSuccess: () => { invalidate(); toast({ title: 'Cotação fechada' }); },
    onError: (error: Error) => toast({ title: 'Erro ao fechar cotação', description: error.message, variant: 'destructive' }),
  });

  const cancelarMutation = useMutation({
    mutationFn: () => cotacaoCompraService.cancelar(id!),
    onSuccess: () => { invalidate(); toast({ title: 'Cotação cancelada' }); },
    onError: (error: Error) => toast({ title: 'Erro ao cancelar cotação', description: error.message, variant: 'destructive' }),
  });

  return {
    cotacao,
    isLoading,
    error,
    convidar: convidarMutation.mutateAsync,
    isConvidando: convidarMutation.isPending,
    removerFornecedor: removerFornecedorMutation.mutateAsync,
    registrarPreco: registrarPrecoMutation.mutateAsync,
    isRegistrandoPreco: registrarPrecoMutation.isPending,
    marcarVencedor: marcarVencedorMutation.mutateAsync,
    fechar: fecharMutation.mutateAsync,
    isFechando: fecharMutation.isPending,
    cancelar: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
  };
};
