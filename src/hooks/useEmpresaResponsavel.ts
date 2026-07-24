import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { empresaResponsavelService } from '@/services/empresaResponsavelService';

export interface EmpresaResponsavel {
  id?: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  logo_url?: string | null;
  configuracoes?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export const useEmpresaResponsavel = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['empresa-responsavel'],
    queryFn: async () => {
      try {
        return await empresaResponsavelService.fetch();
      } catch (e) {
        console.error('[EmpresaResponsavel] erro ao carregar');
        return null;
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (input: EmpresaResponsavel) => empresaResponsavelService.save(input),
    onSuccess: (savedEmpresa) => {
      qc.setQueryData(['empresa-responsavel'], savedEmpresa);
      qc.invalidateQueries({ queryKey: ['empresa-responsavel'] });
      toast.success('Empresa salva com sucesso');
    },
    onError: (e: Error) => {
      console.error('[EmpresaResponsavel] erro ao salvar');
      toast.error(e?.message || 'Falha ao salvar empresa');
    },
  });

  return {
    empresa: query.data || null,
    loading: query.isLoading,
    saving: saveMutation.isPending,
    saveEmpresa: (v: EmpresaResponsavel) => saveMutation.mutateAsync(v),
    refetch: query.refetch,
  };
};
