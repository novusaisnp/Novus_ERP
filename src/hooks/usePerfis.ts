
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Perfil } from '@/types/empresa';

const QUERY_KEY = 'perfis';

const transformSupabaseToPerfil = (item: any): Perfil => ({
  id: item.id,
  nome: item.nome,
  codigo: item.codigo,
  descricao: item.descricao || '',
  permissoes: Array.isArray(item.permissoes) ? (item.permissoes as string[]) : [],
  ativo: item.ativo || false,
  sistema: item.sistema || false,
  createdAt: new Date(item.created_at),
  updatedAt: new Date(item.updated_at)
});

export const usePerfis = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: perfis = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis_acesso')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao carregar perfis:', error);
        throw error;
      }
      return (data || []).map(transformSupabaseToPerfil);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const savePerfil = async (perfilData: Perfil) => {
    try {
      const dataToSave = {
        nome: perfilData.nome,
        codigo: perfilData.codigo,
        descricao: perfilData.descricao,
        permissoes: perfilData.permissoes,
        ativo: perfilData.ativo,
        sistema: perfilData.sistema,
        updated_at: new Date().toISOString()
      };

      const result = perfilData.id
        ? await supabase
            .from('perfis_acesso')
            .update(dataToSave)
            .eq('id', perfilData.id)
            .select()
            .single()
        : await supabase
            .from('perfis_acesso')
            .insert(dataToSave)
            .select()
            .single();

      if (result.error) {
        console.error('Erro ao salvar perfil:', result.error);
        throw result.error;
      }

      await invalidate();
      toast({
        title: "Sucesso",
        description: perfilData.id ? "Perfil atualizado com sucesso!" : "Perfil criado com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar os dados.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deletePerfil = async (id: string) => {
    try {
      const { error } = await supabase
        .from('perfis_acesso')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir perfil:', error);
        throw error;
      }

      await invalidate();
      toast({
        title: "Sucesso",
        description: "Perfil excluído com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('Erro ao excluir perfil:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir os dados.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    perfis,
    loading,
    savePerfil,
    deletePerfil,
    refetch: invalidate
  };
};
