
import { useAuditableEntity } from '@/hooks/useAuditableEntity';
import { auditableCentroCustoService } from '@/services/auditableCentroCustoService';
import type { CentroCusto, CentroCustoInput } from '@/types/configuracoes';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook especializado para Centros de Custo usando o padrão auditável
 * Exemplo de como migrar hooks existentes
 */
export const useAuditableCentrosCusto = () => {
  const { toast } = useToast();

  // Hook base com funcionalidades auditáveis
  const auditableHook = useAuditableEntity<CentroCusto>({
    tableName: 'centros_custo',
    entityName: 'Centro de Custo',
    validateBeforeDelete: async (id: string) => {
      const hasRestrictions = await auditableCentroCustoService.hasRestrictions(id);
      return !hasRestrictions;
    }
  });

  // Métodos específicos do domínio
  const createCentroCusto = async (input: CentroCustoInput): Promise<CentroCusto | null> => {
    try {
      console.log(`[useAuditableCentrosCusto] Criando centro de custo:`, input.nome);
      
      const novoCentroCusto = await auditableCentroCustoService.createCentroCusto(input);
      
      toast({
        title: 'Sucesso',
        description: 'Centro de custo criado com sucesso!',
      });
      
      // Recarregar dados ativos
      await auditableHook.fetchActive();
      
      return novoCentroCusto;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar centro de custo';
      console.error(`[useAuditableCentrosCusto] Erro:`, err);
      
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      
      return null;
    }
  };

  const updateCentroCusto = async (id: string, input: CentroCustoInput): Promise<CentroCusto | null> => {
    try {
      console.log(`[useAuditableCentrosCusto] Atualizando centro de custo:`, id);
      
      const centroCustoAtualizado = await auditableCentroCustoService.updateCentroCusto(id, input);
      
      toast({
        title: 'Sucesso',
        description: 'Centro de custo atualizado com sucesso!',
      });
      
      // Recarregar dados ativos
      await auditableHook.fetchActive();
      
      return centroCustoAtualizado;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar centro de custo';
      console.error(`[useAuditableCentrosCusto] Erro:`, err);
      
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      
      return null;
    }
  };

  return {
    // Funcionalidades auditáveis herdadas
    ...auditableHook,
    
    // Métodos específicos do domínio
    createCentroCusto,
    updateCentroCusto,
    
    // Aliases para melhor semântica
    centrosCusto: auditableHook.entities,
    arquivarCentroCusto: auditableHook.softDelete,
    restaurarCentroCusto: auditableHook.restore,
    carregarAtivos: auditableHook.fetchActive,
    carregarArquivados: auditableHook.fetchArchived,
    carregarTodos: auditableHook.fetchAll,
  };
};
