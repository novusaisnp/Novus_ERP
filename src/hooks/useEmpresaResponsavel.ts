
import { useState, useEffect } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { useToast } from '@/hooks/use-toast';
import { EmpresaResponsavel } from '@/types/empresa';

export const useEmpresaResponsavel = () => {
  const [empresa, setEmpresa] = useState<EmpresaResponsavel | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadEmpresa = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('empresa_responsavel')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar empresa responsável:', error);
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar os dados da empresa responsável.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        setEmpresa({
          id: data.id,
          cnpj: data.cnpj,
          razaoSocial: data.razao_social,
          nomeFantasia: data.nome_fantasia,
          endereco: data.endereco as any,
          nomeResponsavel: data.nome_responsavel,
          contatos: data.contatos as any,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        });
      }
    } catch (error) {
      console.error('Erro ao carregar empresa responsável:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveEmpresa = async (empresaData: EmpresaResponsavel) => {
    setLoading(true);
    try {
      const dataToSave = {
        cnpj: empresaData.cnpj,
        razao_social: empresaData.razaoSocial,
        nome_fantasia: empresaData.nomeFantasia,
        endereco: empresaData.endereco as any,
        nome_responsavel: empresaData.nomeResponsavel,
        contatos: empresaData.contatos as any,
        updated_at: new Date().toISOString()
      };

      let result: any;
      if (empresaData.id) {
        result = await (supabase as any)
          .from('empresa_responsavel')
          .update(dataToSave)
          .eq('id', empresaData.id)
          .select()
          .single();
      } else {
        result = await (supabase as any)
          .from('empresa_responsavel')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Erro ao salvar empresa responsável:', result.error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar os dados da empresa responsável.",
          variant: "destructive"
        });
        return false;
      }

      // Atualizar estado local
      if (result.data) {
        setEmpresa({
          id: result.data.id,
          cnpj: result.data.cnpj,
          razaoSocial: result.data.razao_social,
          nomeFantasia: result.data.nome_fantasia,
          endereco: result.data.endereco as any,
          nomeResponsavel: result.data.nome_responsavel,
          contatos: result.data.contatos as any,
          createdAt: new Date(result.data.created_at),
          updatedAt: new Date(result.data.updated_at)
        });
      }

      toast({
        title: "Sucesso",
        description: empresaData.id ? "Empresa atualizada com sucesso!" : "Empresa cadastrada com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Erro ao salvar empresa responsável:', error);
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

  useEffect(() => {
    loadEmpresa();
  }, []);

  return {
    empresa,
    loading,
    saveEmpresa,
    refetch: loadEmpresa
  };
};
