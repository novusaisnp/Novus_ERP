
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tamanhoService, type Tamanho, type TamanhoInsert, type TamanhoUpdate } from '@/services/tamanhoService';
import { toast } from 'sonner';

const QUERY_KEY = 'tamanhos';

export const useTamanhos = () => {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: tamanhoService.getAll,
  });
};

export const useTamanho = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => tamanhoService.getById(id),
    enabled: !!id,
  });
};

export const useCreateTamanho = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tamanho: TamanhoInsert) => tamanhoService.create(tamanho),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tamanho criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useTamanhos] Erro ao criar tamanho:', error);
      toast.error('Erro ao criar tamanho: ' + error.message);
    },
  });
};

export const useUpdateTamanho = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tamanho }: { id: string; tamanho: TamanhoUpdate }) =>
      tamanhoService.update(id, tamanho),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tamanho atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useTamanhos] Erro ao atualizar tamanho:', error);
      toast.error('Erro ao atualizar tamanho: ' + error.message);
    },
  });
};

export const useDeleteTamanho = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tamanhoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tamanho removido com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useTamanhos] Erro ao remover tamanho:', error);
      toast.error('Erro ao remover tamanho: ' + error.message);
    },
  });
};
