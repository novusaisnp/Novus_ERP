import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const supabase: any = _supabase;

export interface EmpresaResponsavel {
  id?: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  logo_url?: string | null;
  configuracoes?: Record<string, any> | null;
}

async function fetchEmpresa(): Promise<EmpresaResponsavel | null> {
  const { data, error } = await supabase.from('empresa_responsavel').select('*').maybeSingle();
  if (error) {
    console.error('[EmpresaResponsavel] erro ao carregar');
    return null;
  }
  return (data as EmpresaResponsavel) || null;
}

export const useEmpresaResponsavel = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({ queryKey: ['empresa-responsavel'], queryFn: fetchEmpresa });

  const saveMutation = useMutation({
    mutationFn: async (input: EmpresaResponsavel) => {
      const payload = {
        nome: input.nome,
        cnpj: input.cnpj || null,
        email: input.email || null,
        telefone: input.telefone || null,
        endereco: input.endereco || null,
        logo_url: input.logo_url || null,
        configuracoes: input.configuracoes || {},
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase.from('empresa_responsavel').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('empresa_responsavel').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresa-responsavel'] });
      toast({ title: 'Empresa salva com sucesso' });
    },
    onError: (e: any) => {
      console.error('[EmpresaResponsavel] erro ao salvar');
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar empresa', variant: 'destructive' });
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
