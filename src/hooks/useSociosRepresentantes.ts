import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sociosRepresentantesService } from '@/services/sociosRepresentantesService';
import type { SocioRepresentante } from '@/types/socios';

export const useSociosRepresentantes = (empresaId?: string) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['socios-representantes', empresaId],
    queryFn: () =>
      empresaId ? sociosRepresentantesService.listByEmpresa(empresaId) : Promise.resolve([]),
    enabled: !!empresaId,
  });

  const saveMutation = useMutation({
    mutationFn: (input: SocioRepresentante) => sociosRepresentantesService.save(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios-representantes', empresaId] });
      qc.invalidateQueries({ queryKey: ['socios-disponiveis'] });
      toast.success('Sócio/representante salvo');
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sociosRepresentantesService.softDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios-representantes', empresaId] });
      toast.success('Removido');
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao remover'),
  });

  return {
    socios: query.data || [],
    loading: query.isLoading,
    save: (v: SocioRepresentante) => saveMutation.mutateAsync(v),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    saving: saveMutation.isPending,
  };
};
