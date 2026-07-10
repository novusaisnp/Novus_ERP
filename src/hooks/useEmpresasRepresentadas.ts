import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const supabase: any = _supabase;

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
}

async function fetchEmpresas(): Promise<EmpresaRepresentada[]> {
  const { data, error } = await supabase
    .from('empresas_representadas')
    .select('*')
    .order('nome');
  if (error) {
    console.error('[EmpresasRepresentadas] erro ao carregar');
    return [];
  }
  return (data as EmpresaRepresentada[]) || [];
}

export const useEmpresasRepresentadas = (_?: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({ queryKey: ['empresas-representadas'], queryFn: fetchEmpresas });

  const saveMutation = useMutation({
    mutationFn: async (input: EmpresaRepresentada) => {
      const payload = {
        nome: input.nome,
        cnpj: input.cnpj || null,
        email: input.email || null,
        telefone: input.telefone || null,
        endereco: input.endereco || null,
        cidade: input.cidade || null,
        estado: input.estado || null,
        cep: input.cep || null,
        ativo: input.ativo ?? true,
        configuracoes: input.configuracoes || {},
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase.from('empresas_representadas').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('empresas_representadas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresas-representadas'] });
      toast({ title: 'Empresa salva com sucesso' });
    },
    onError: (e: any) => {
      console.error('[EmpresasRepresentadas] erro ao salvar');
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresas_representadas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresas-representadas'] });
      toast({ title: 'Empresa removida' });
    },
    onError: (e: any) => {
      console.error('[EmpresasRepresentadas] erro ao excluir');
      toast({ title: 'Erro', description: e?.message || 'Falha ao excluir', variant: 'destructive' });
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
