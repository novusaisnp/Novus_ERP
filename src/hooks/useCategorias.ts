
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriaService, type Categoria, type CategoriaInsert, type CategoriaUpdate } from '@/services/categoriaService';
import { toast } from 'sonner';

const QUERY_KEY = 'categorias';

export const useCategorias = () => {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: categoriaService.getAll,
  });
};

export const useCategoria = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => categoriaService.getById(id),
    enabled: !!id,
  });
};

export const useCreateCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoria: CategoriaInsert) => categoriaService.create(categoria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useCategorias] Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });
};

export const useUpdateCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, categoria }: { id: string; categoria: CategoriaUpdate }) =>
      categoriaService.update(id, categoria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useCategorias] Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });
};

export const useDeleteCategoria = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoriaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Categoria removida com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useCategorias] Erro ao remover categoria:', error);
      toast.error('Erro ao remover categoria: ' + error.message);
    },
  });
};
