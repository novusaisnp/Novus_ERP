import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const supabase: any = _supabase;

export interface MeuPerfil {
  id?: string;
  user_id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
}

async function fetchMeuPerfil(): Promise<MeuPerfil | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('perfis')
    .select('id, user_id, nome, email, avatar_url')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) {
    console.error('[MeuPerfil] erro ao carregar');
    return null;
  }
  return (data as MeuPerfil) || null;
}

export const useMeuPerfil = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({ queryKey: ['meu-perfil'], queryFn: fetchMeuPerfil });

  const saveMutation = useMutation({
    mutationFn: async (patch: { nome: string | null; avatar_url: string | null }) => {
      const current = query.data;
      if (!current?.id) throw new Error('Perfil não encontrado');
      const { error } = await supabase
        .from('perfis')
        .update({
          nome: patch.nome,
          avatar_url: patch.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meu-perfil'] });
      toast({ title: 'Perfil atualizado' });
    },
    onError: (e: any) => {
      console.error('[MeuPerfil] erro ao salvar');
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar', variant: 'destructive' });
    },
  });

  return {
    perfil: query.data || null,
    loading: query.isLoading,
    saving: saveMutation.isPending,
    savePerfil: saveMutation.mutateAsync,
  };
};
