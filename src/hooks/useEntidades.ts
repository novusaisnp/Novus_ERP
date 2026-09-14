import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { entidadeService } from '@/services/entidadeService';
import type { Paginacao } from '@/services/entidadeService';
import type { Entidade, PapelCodigo } from '@/types/entidade';
import { useToast } from '@/components/ui/use-toast';

interface UseEntidadesOpts {
  busca?: string;
  paginacao?: Paginacao;
}

export const useEntidades = (
  empresaRepresentadaId: string | null,
  papel: PapelCodigo | undefined,
  opts: UseEntidadesOpts = {},
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { busca = '', paginacao } = opts;

  // Debounce da busca — mesmo padrão de useContaContabilSearch.ts (300ms).
  const [debouncedBusca, setDebouncedBusca] = useState(busca);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusca(busca), 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const queryKey = ['entidades', papel, empresaRepresentadaId, debouncedBusca, paginacao];

  const { data: result, isLoading: loading, isFetching } = useQuery({
    queryKey,
    queryFn: () => entidadeService.fetchEntidades(empresaRepresentadaId!, papel, { busca: debouncedBusca, paginacao }),
    enabled: !!empresaRepresentadaId,
  });
  const entidades = result?.data ?? [];
  const total = result?.total ?? 0;

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
      if (!empresaRepresentadaId) throw new Error('Empresa ativa não resolvida.');
      await entidadeService.deleteEntidade(id, empresaRepresentadaId);
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
