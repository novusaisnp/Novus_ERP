import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { empresaResponsavelService } from '@/services/empresaResponsavelService';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

export interface EmpresaResponsavel {
  id?: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  configuracoes?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export const useEmpresaResponsavel = () => {
  const qc = useQueryClient();

  // empresa_responsavel é escopada por empresa — a queryKey precisa da empresa ativa
  // pra não vazar cache de uma empresa pra outra ao trocar no seletor (mesmo padrão
  // usado em useCatalogoOrcamento/useRelatoriosContabeis/etc).
  const empresaAtivaQuery = useQuery({
    queryKey: ['empresa-ativa-id'],
    queryFn: getEmpresaAtivaId,
  });
  const empresaAtivaId = empresaAtivaQuery.data;

  const query = useQuery({
    queryKey: ['empresa-responsavel', empresaAtivaId],
    enabled: !!empresaAtivaId,
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
      qc.setQueryData(['empresa-responsavel', empresaAtivaId], savedEmpresa);
      qc.invalidateQueries({ queryKey: ['empresa-responsavel', empresaAtivaId] });
      toast.success('Empresa salva com sucesso');
    },
    onError: (e: Error) => {
      console.error('[EmpresaResponsavel] erro ao salvar');
      toast.error(e?.message || 'Falha ao salvar empresa');
    },
  });

  return {
    empresa: query.data || null,
    loading: empresaAtivaQuery.isLoading || query.isLoading,
    saving: saveMutation.isPending,
    saveEmpresa: (v: EmpresaResponsavel) => saveMutation.mutateAsync(v),
    refetch: query.refetch,
  };
};
