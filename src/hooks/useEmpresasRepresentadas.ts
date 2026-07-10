
import { useState, useEffect } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { useToast } from '@/hooks/use-toast';
import { EmpresaRepresentada } from '@/types/empresa';

export const useEmpresasRepresentadas = (empresaResponsavelId?: string) => {
  const [empresas, setEmpresas] = useState<EmpresaRepresentada[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadEmpresas = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('empresas_representadas')
        .select('*')
        .order('razao_social');

      if (error) {
        console.error('Erro ao carregar empresas representadas:', error);
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar as empresas representadas.",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const empresasFormatadas = (data as any[]).map((item: any) => ({
          id: item.id,
          empresaResponsavelId: item.empresa_responsavel_id || '',
          cnpj: item.cnpj,
          razaoSocial: item.razao_social,
          nomeFantasia: item.nome_fantasia,
          endereco: item.endereco as any,
          qualificacaoFiscal: item.qualificacao_fiscal as any,
          logomarca: item.logomarca as any,
          configuracaoNF: item.configuracao_nf as any,
          ativa: item.ativa || false,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }));
        setEmpresas(empresasFormatadas);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas representadas:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveEmpresa = async (empresaData: EmpresaRepresentada) => {
    setLoading(true);
    try {
      // Converter Date para string ISO no certificado digital se existir
      const configuracaoNF = { ...empresaData.configuracaoNF };
      if (configuracaoNF.certificadoDigital?.validade instanceof Date) {
        configuracaoNF.certificadoDigital.validade = configuracaoNF.certificadoDigital.validade.toISOString() as any;
      }

      const dataToSave = {
        empresa_responsavel_id: empresaData.empresaResponsavelId || empresaResponsavelId,
        cnpj: empresaData.cnpj,
        razao_social: empresaData.razaoSocial,
        nome_fantasia: empresaData.nomeFantasia,
        endereco: empresaData.endereco as any,
        qualificacao_fiscal: empresaData.qualificacaoFiscal as any,
        logomarca: empresaData.logomarca as any,
        configuracao_nf: configuracaoNF as any,
        ativa: empresaData.ativa,
        updated_at: new Date().toISOString()
      };

      let result: any;
      if (empresaData.id) {
        result = await (supabase as any)
          .from('empresas_representadas')
          .update(dataToSave)
          .eq('id', empresaData.id)
          .select()
          .single();
      } else {
        result = await (supabase as any)
          .from('empresas_representadas')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Erro ao salvar empresa representada:', result.error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar os dados da empresa representada.",
          variant: "destructive"
        });
        return false;
      }

      // Recarregar lista
      await loadEmpresas();

      toast({
        title: "Sucesso",
        description: empresaData.id ? "Empresa atualizada com sucesso!" : "Empresa cadastrada com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Erro ao salvar empresa representada:', error);
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

  const deleteEmpresa = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('empresas_representadas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir empresa representada:', error);
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir a empresa representada.",
          variant: "destructive"
        });
        return false;
      }

      // Recarregar lista
      await loadEmpresas();

      toast({
        title: "Sucesso",
        description: "Empresa excluída com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Erro ao excluir empresa representada:', error);
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
    loadEmpresas();
  }, [empresaResponsavelId]);

  return {
    empresas,
    loading,
    saveEmpresa,
    deleteEmpresa,
    refetch: loadEmpresas
  };
};
