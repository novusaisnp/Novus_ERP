import { useQuery, useQueryClient } from '@tanstack/react-query';
import { entidadeService } from '@/services/entidadeService';
import type { Entidade, PapelCodigo } from '@/types/entidade';
import { useToast } from '@/components/ui/use-toast';

export const useEntidades = (empresaRepresentadaId: string | null, papel: PapelCodigo) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['entidades', papel, empresaRepresentadaId];

  const { data: entidades = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => entidadeService.fetchEntidades(empresaRepresentadaId!, papel),
    enabled: !!empresaRepresentadaId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleError = (error: unknown, defaultMessage: string) => {
    console.error('[useEntidades]', error);
    toast({ title: 'Erro', description: (error as Error)?.message || defaultMessage, variant: 'destructive' });
  };

  const save = async (entidade: Entidade) => {
    try {
      if (entidade.id) {
        await entidadeService.updateEntidade(entidade.id, entidade);
        toast({ title: 'Sucesso', description: 'Cadastro atualizado com sucesso!' });
      } else {
        await entidadeService.createEntidade(entidade);
        toast({ title: 'Sucesso', description: 'Cadastro criado com sucesso!' });
      }
      await invalidate();
      return true;
    } catch (error) {
      handleError(error, 'Erro inesperado ao salvar os dados.');
      return false;
    }
  };

  const remove = async (id: string) => {
    try {
      await entidadeService.deleteEntidade(id);
      await invalidate();
      toast({ title: 'Sucesso', description: 'Registro excluído com sucesso!' });
      return true;
    } catch (error) {
      handleError(error, 'Erro inesperado ao excluir os dados.');
      return false;
    }
  };

  return { entidades, loading, save, remove, refetch: invalidate };
};
