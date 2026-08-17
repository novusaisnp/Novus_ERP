import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendasService, type Paginacao } from '@/services/vendasService';
import { Venda, VendaFiltros } from '@/types/vendas';
import { useToast } from '@/hooks/use-toast';

export const useVendas = (filtros: VendaFiltros = {}, paginacao?: Paginacao) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ['vendas', filtros, paginacao],
    queryFn: () => vendasService.list(filtros, paginacao),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendas'] });

  const saveMutation = useMutation({
    mutationFn: (v: Venda) => vendasService.save(v),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Venda salva com sucesso' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar venda', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendasService.softDelete(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Venda excluída' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao excluir', variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => vendasService.cancelar(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Venda cancelada' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao cancelar', variant: 'destructive' }),
  });

  return {
    vendas: listQuery.data?.data || [],
    total: listQuery.data?.total || 0,
    loading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    refetch: listQuery.refetch,
    saveVenda: saveMutation.mutateAsync,
    excluirVenda: deleteMutation.mutateAsync,
    cancelarVenda: cancelMutation.mutateAsync,
    saving: saveMutation.isPending,
  };
};
