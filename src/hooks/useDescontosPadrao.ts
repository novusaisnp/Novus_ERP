
import { useState, useEffect } from 'react';
import { DescontoPadrao } from '@/types/rh';
import { descontoPadraoService } from '@/services/descontoPadraoService';
import { useToast } from '@/hooks/use-toast';

export const useDescontosPadrao = () => {
  const [descontos, setDescontos] = useState<DescontoPadrao[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadDescontos = async () => {
    try {
      console.log('[DescontosPadrao] Hook - Carregando descontos...');
      setLoading(true);
      const data = await descontoPadraoService.fetchDescontos();
      const transformedData = data.map(transformSupabaseToDescontoPadrao);
      setDescontos(transformedData);
      console.log('[DescontosPadrao] Hook - Descontos carregados:', transformedData.length);
    } catch (error) {
      console.error('[DescontosPadrao] Hook - Erro ao carregar descontos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os descontos padrão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDesconto = async (desconto: DescontoPadrao): Promise<boolean> => {
    try {
      console.log('[DescontosPadrao] Hook - Salvando desconto:', desconto.codigo);
      
      if (desconto.id) {
        await descontoPadraoService.updateDesconto(desconto.id, desconto);
      } else {
        await descontoPadraoService.createDesconto(desconto);
      }
      
      await loadDescontos();
      return true;
    } catch (error) {
      console.error('[DescontosPadrao] Hook - Erro ao salvar desconto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o desconto padrão.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteDesconto = async (id: string): Promise<void> => {
    try {
      console.log('[DescontosPadrao] Hook - Excluindo desconto:', id);
      await descontoPadraoService.deleteDesconto(id);
      await loadDescontos();
      toast({
        title: "Sucesso",
        description: "Desconto padrão excluído com sucesso!",
      });
    } catch (error) {
      console.error('[DescontosPadrao] Hook - Erro ao excluir desconto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o desconto padrão.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadDescontos();
  }, []);

  return {
    descontos,
    loading,
    saveDesconto,
    deleteDesconto,
    reloadDescontos: loadDescontos
  };
};

// Função de transformação dos dados do Supabase
const transformSupabaseToDescontoPadrao = (data: any): DescontoPadrao => {
  return {
    id: data.id,
    codigo: data.codigo,
    descricao: data.descricao,
    tipo: data.tipo as 'FIXO' | 'PERCENTUAL' | 'TABELA',
    valor: data.valor || undefined,
    percentual: data.percentual || undefined,
    tabelaProgressiva: data.tabela_progressiva || undefined,
    ativo: data.ativo,
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
};
