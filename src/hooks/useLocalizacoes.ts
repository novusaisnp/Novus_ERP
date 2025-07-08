
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localizacaoService, type Localizacao, type LocalizacaoInsert, type LocalizacaoUpdate } from '@/services/localizacaoService';
import { toast } from 'sonner';

const QUERY_KEY = 'localizacoes';

export const useLocalizacoes = () => {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: localizacaoService.getAll,
  });
};

export const useLocalizacao = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => localizacaoService.getById(id),
    enabled: !!id,
  });
};

export const useCreateLocalizacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (localizacao: LocalizacaoInsert) => localizacaoService.create(localizacao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Localização criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useLocalizacoes] Erro ao criar localização:', error);
      toast.error('Erro ao criar localização: ' + error.message);
    },
  });
};

export const useUpdateLocalizacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, localizacao }: { id: string; localizacao: LocalizacaoUpdate }) =>
      localizacaoService.update(id, localizacao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Localização atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useLocalizacoes] Erro ao atualizar localização:', error);
      toast.error('Erro ao atualizar localização: ' + error.message);
    },
  });
};

export const useDeleteLocalizacao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => localizacaoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Localização removida com sucesso!');
    },
    onError: (error: Error) => {
      console.error('[useLocalizacoes] Erro ao remover localização:', error);
      toast.error('Erro ao remover localização: ' + error.message);
    },
  });
};
