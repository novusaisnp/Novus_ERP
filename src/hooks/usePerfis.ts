
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Perfil } from '@/types/empresa';

export const usePerfis = () => {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPerfis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('perfis_acesso')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao carregar perfis:', error);
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar os perfis.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const perfisFormatados = (data as any[]).map((item: any) => ({
          id: item.id,
          nome: item.nome,
          codigo: item.codigo,
          descricao: item.descricao || '',
          permissoes: Array.isArray(item.permissoes) 
            ? (item.permissoes as string[])
            : [],
          ativo: item.ativo || false,
          sistema: item.sistema || false,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }));
        setPerfis(perfisFormatados);
      }
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePerfil = async (perfilData: Perfil) => {
    setLoading(true);
    try {
      const dataToSave = {
        nome: perfilData.nome,
        codigo: perfilData.codigo,
        descricao: perfilData.descricao,
        permissoes: perfilData.permissoes as any,
        ativo: perfilData.ativo,
        sistema: perfilData.sistema,
        updated_at: new Date().toISOString()
      };

      let result: any;
      if (perfilData.id) {
        result = await supabase
          .from('perfis_acesso')
          .update(dataToSave)
          .eq('id', perfilData.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('perfis_acesso')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Erro ao salvar perfil:', result.error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar os dados do perfil.",
          variant: "destructive"
        });
        return false;
      }

      // Recarregar lista
      await loadPerfis();

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
    } finally {
      setLoading(false);
    }
  };

  const deletePerfil = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('perfis_acesso')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir perfil:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o perfil.",
          variant: "destructive"
        });
        return false;
      }

      // Recarregar lista
      await loadPerfis();

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerfis();
  }, []);

  return {
    perfis,
    loading,
    savePerfil,
    deletePerfil,
    refetch: loadPerfis
  };
};
