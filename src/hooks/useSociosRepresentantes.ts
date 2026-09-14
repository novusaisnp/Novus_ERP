import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sociosRepresentantesService } from '@/services/sociosRepresentantesService';
import { revogarAdminSatelites } from '@/lib/provisionarAdminSatelites';
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
    mutationFn: async (input: SocioRepresentante) => {
      const salvo = await sociosRepresentantesService.save(input);
      // Desligar o sócio aqui tem que tirar o acesso nos satélites também — senão a
      // conta continua ativa em cada um deles, invisível de dentro do ERP.
      if (input.id && input.ativo === false) {
        await revogarAdminSatelites(input.id);
      }
      return salvo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['socios-representantes', empresaId] });
      qc.invalidateQueries({ queryKey: ['socios-disponiveis'] });
      toast.success('Sócio/representante salvo');
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
  });

  const deleteMutation = useMutation({
    // Revoga ANTES do soft delete: a Porta 0.2 resolve o sócio com `deleted_at IS NULL`
    // e não acharia mais o registro depois.
    mutationFn: async (id: string) => {
      if (!empresaId) throw new Error('Empresa ativa não resolvida.');
      await revogarAdminSatelites(id);
      return sociosRepresentantesService.softDelete(id, empresaId);
    },
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
