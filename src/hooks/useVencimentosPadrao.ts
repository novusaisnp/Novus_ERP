
import { useState, useEffect } from 'react';
import { VencimentoPadrao } from '@/types/rh';
import { vencimentoPadraoService } from '@/services/vencimentoPadraoService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

export const useVencimentosPadrao = () => {
  const [vencimentos, setVencimentos] = useState<VencimentoPadrao[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadVencimentos = async () => {
    console.log('[VencimentosPadrao] Iniciando carregamento de vencimentos padrão');
    setLoading(true);
    try {
      const data = await vencimentoPadraoService.fetchVencimentos();
      console.log('[VencimentosPadrao] Dados brutos do Supabase:', data);
      
      const vencimentosFormatados = data.map(rhUtils.transformSupabaseToVencimentoPadrao);
      console.log('[VencimentosPadrao] Vencimentos formatados:', vencimentosFormatados);
      
      setVencimentos(vencimentosFormatados);
      console.log('[VencimentosPadrao] Estado atualizado com', vencimentosFormatados.length, 'vencimentos');
    } catch (error) {
      console.error('[VencimentosPadrao] Erro ao carregar vencimentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os vencimentos padrão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveVencimento = async (vencimentoData: VencimentoPadrao) => {
    console.log('[VencimentosPadrao] Iniciando salvamento de vencimento:', vencimentoData.codigo);
    setLoading(true);
    
    try {
      // Validação obrigatória
      if (!vencimentoData.codigo?.trim() || !vencimentoData.descricao?.trim()) {
        console.log('[VencimentosPadrao] Validação falhou: campos obrigatórios');
        toast({
          title: "Erro de Validação",
          description: "Código e descrição são obrigatórios.",
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      let resultado;
      if (vencimentoData.id) {
        console.log('[VencimentosPadrao] Atualizando vencimento existente:', vencimentoData.id);
        resultado = await vencimentoPadraoService.updateVencimento(vencimentoData.id, vencimentoData);
      } else {
        console.log('[VencimentosPadrao] Criando novo vencimento');
        resultado = await vencimentoPadraoService.createVencimento(vencimentoData);
      }

      console.log('[VencimentosPadrao] Vencimento salvo com sucesso:', resultado);
      
      // Recarrega a lista para garantir dados atualizados
      await loadVencimentos();
      
      toast({
        title: "Sucesso",
        description: vencimentoData.id ? "Vencimento atualizado com sucesso!" : "Vencimento cadastrado com sucesso!",
      });
      
      return true;
    } catch (error) {
      console.error('[VencimentosPadrao] Erro ao salvar vencimento:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteVencimento = async (id: string) => {
    console.log('[VencimentosPadrao] Iniciando exclusão de vencimento:', id);
    setLoading(true);
    try {
      await vencimentoPadraoService.deleteVencimento(id);
      console.log('[VencimentosPadrao] Vencimento excluído com sucesso');
      
      // Recarrega a lista
      await loadVencimentos();
      
      toast({
        title: "Sucesso",
        description: "Vencimento excluído com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[VencimentosPadrao] Erro ao excluir vencimento:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[VencimentosPadrao] Hook inicializado, carregando vencimentos');
    loadVencimentos();
  }, []);

  return {
    vencimentos,
    loading,
    saveVencimento,
    deleteVencimento,
    refetch: loadVencimentos
  };
};
