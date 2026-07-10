import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendasService } from '@/services/vendasService';
import { Venda, VendaFiltros } from '@/types/vendas';
import { useToast } from '@/hooks/use-toast';

export const useVendas = (filtros: VendaFiltros = {}) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ['vendas', filtros],
    queryFn: () => vendasService.list(filtros),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendas'] });

  const saveMutation = useMutation({
    mutationFn: (v: Venda) => vendasService.save(v),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Venda salva com sucesso' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar venda', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendasService.softDelete(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Venda excluída' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao excluir', variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => vendasService.cancelar(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Venda cancelada' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao cancelar', variant: 'destructive' }),
  });

  return {
    vendas: listQuery.data || [],
    loading: listQuery.isLoading,
    refetch: listQuery.refetch,
    saveVenda: saveMutation.mutateAsync,
    excluirVenda: deleteMutation.mutateAsync,
    cancelarVenda: cancelMutation.mutateAsync,
    saving: saveMutation.isPending,
  };
};
