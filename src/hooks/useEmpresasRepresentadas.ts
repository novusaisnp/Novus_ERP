import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { empresasRepresentadasService } from '@/services/empresasRepresentadasService';

export interface EmpresaRepresentada {
  id?: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  ativo?: boolean;
  configuracoes?: Record<string, any> | null;
  [key: string]: any;
}

export const useEmpresasRepresentadas = (_?: string) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['empresas-representadas'],
    queryFn: async () => {
      try {
        return await empresasRepresentadasService.list();
      } catch (e) {
        console.error('[EmpresasRepresentadas] erro ao carregar');
        return [];
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: (input: EmpresaRepresentada) => empresasRepresentadasService.save(input),
    onSuccess: (savedEmpresa) => {
      qc.setQueryData<EmpresaRepresentada[]>(['empresas-representadas'], (current = []) => {
        const exists = current.some((empresa) => empresa.id === savedEmpresa.id);
        const next = exists
          ? current.map((empresa) => (empresa.id === savedEmpresa.id ? savedEmpresa : empresa))
          : [...current, savedEmpresa];

        return next.sort((a, b) => a.nome.localeCompare(b.nome));
      });
      qc.invalidateQueries({ queryKey: ['empresas-representadas'] });
      toast.success('Empresa salva com sucesso');
    },
    onError: (e: any) => {
      console.error('[EmpresasRepresentadas] erro ao salvar');
      toast.error(e?.message || 'Falha ao salvar empresa');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => empresasRepresentadasService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresas-representadas'] });
      toast.success('Empresa removida');
    },
    onError: (e: any) => {
      console.error('[EmpresasRepresentadas] erro ao excluir');
      toast.error(e?.message || 'Falha ao excluir empresa');
    },
  });

  return {
    empresas: query.data || [],
    loading: query.isLoading,
    saveEmpresa: (v: EmpresaRepresentada) => saveMutation.mutateAsync(v),
    deleteEmpresa: (id: string) => deleteMutation.mutateAsync(id),
    refetch: query.refetch,
  };
};
