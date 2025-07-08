
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unidadeMedidaService, type UnidadeMedida, type UnidadeMedidaInsert, type UnidadeMedidaUpdate } from '@/services/unidadeMedidaService';
import { toast } from 'sonner';

const QUERY_KEY = 'unidades-medida';

export const useUnidadesMedida = () => {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: unidadeMedidaService.getAll,
  });
};

export const useUnidadeMedida = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => unidadeMedidaService.getById(id),
    enabled: !!id,
  });
};

export const useCreateUnidadeMedida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unidadeMedida: UnidadeMedidaInsert) => unidadeMedidaService.create(unidadeMedida),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade de medida criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useUnidadesMedida] Erro ao criar unidade de medida:', error);
      toast.error('Erro ao criar unidade de medida: ' + error.message);
    },
  });
};

export const useUpdateUnidadeMedida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, unidadeMedida }: { id: string; unidadeMedida: UnidadeMedidaUpdate }) =>
      unidadeMedidaService.update(id, unidadeMedida),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade de medida atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useUnidadesMedida] Erro ao atualizar unidade de medida:', error);
      toast.error('Erro ao atualizar unidade de medida: ' + error.message);
    },
  });
};

export const useDeleteUnidadeMedida = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unidadeMedidaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Unidade de medida removida com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useUnidadesMedida] Erro ao remover unidade de medida:', error);
      toast.error('Erro ao remover unidade de medida: ' + error.message);
    },
  });
};
