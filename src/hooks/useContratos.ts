import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contratosService } from '@/services/contratosService';
import { Contrato, ContratoFiltros } from '@/types/contratos';
import { useToast } from '@/hooks/use-toast';

export const useContratos = (filtros: ContratoFiltros = {}) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const listQuery = useQuery({
    queryKey: ['contratos', filtros],
    queryFn: () => contratosService.list(filtros),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contratos'] });

  const saveMutation = useMutation({
    mutationFn: (c: Contrato) => contratosService.save(c),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Contrato salvo com sucesso' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar contrato', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contratosService.softDelete(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Contrato excluído' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro', description: e?.message || 'Falha ao excluir', variant: 'destructive' }),
  });

  return {
    contratos: listQuery.data || [],
    loading: listQuery.isLoading,
    refetch: listQuery.refetch,
    saveContrato: saveMutation.mutateAsync,
    excluirContrato: deleteMutation.mutateAsync,
    saving: saveMutation.isPending,
  };
};
