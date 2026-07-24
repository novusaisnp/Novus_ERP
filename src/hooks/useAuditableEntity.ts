
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditableEntityHookOptions {
  tableName: string;
  entityName: string;
  validateBeforeDelete?: (id: string) => Promise<boolean>;
}

export interface AuditableEntityResult<T> {
  entities: T[];
  loading: boolean;
  error: string | null;
  softDelete: (id: string, data?: T) => Promise<boolean>;
  restore: (id: string) => Promise<boolean>;
  fetchActive: () => Promise<void>;
  fetchArchived: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

/**
 * Hook genérico para entidades auditáveis com soft delete
 * Fornece herança automática de proteções para qualquer nova tabela
 */
export const useAuditableEntity = <T extends { id: string; deleted_at?: string | null }>(
  options: AuditableEntityHookOptions
): AuditableEntityResult<T> => {
  const [entities, setEntities] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { tableName, entityName, validateBeforeDelete } = options;

  console.log(`[${entityName}] Hook auditável inicializado para tabela: ${tableName}`);

  const fetchActive = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[${entityName}] Buscando registros ativos...`);
      
      // Usar any para evitar erro de tipo específico do Supabase
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[${entityName}] Erro ao buscar registros:`, error);
        throw error;
      }

      console.log(`[${entityName}] ${data?.length || 0} registros ativos encontrados`);
      setEntities(data as T[]);
    } catch (err: any) {
      const message = err.message || `Erro ao carregar ${entityName.toLowerCase()}`;
      setError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tableName, entityName, toast]);

  const fetchArchived = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[${entityName}] Buscando registros arquivados...`);
      
      // Usar any para evitar erro de tipo específico do Supabase
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error(`[${entityName}] Erro ao buscar arquivados:`, error);
        throw error;
      }

      console.log(`[${entityName}] ${data?.length || 0} registros arquivados encontrados`);
      setEntities(data as T[]);
    } catch (err: any) {
      const message = err.message || `Erro ao carregar ${entityName.toLowerCase()} arquivados`;
      setError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tableName, entityName, toast]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`[${entityName}] Buscando todos os registros...`);
      
      // Usar any para evitar erro de tipo específico do Supabase
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[${entityName}] Erro ao buscar todos:`, error);
        throw error;
      }

      console.log(`[${entityName}] ${data?.length || 0} registros totais encontrados`);
      setEntities(data as T[]);
    } catch (err: any) {
      const message = err.message || `Erro ao carregar todos os ${entityName.toLowerCase()}`;
      setError(message);
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tableName, entityName, toast]);

  const softDelete = useCallback(async (id: string, entityData?: T): Promise<boolean> => {
    try {
      console.log(`[${entityName}] Iniciando soft delete para ID:`, id);
      
      // Validação customizada se fornecida
      if (validateBeforeDelete) {
        const canDelete = await validateBeforeDelete(id);
        if (!canDelete) {
          toast({
            title: "Operação não permitida",
            description: `Este ${entityName.toLowerCase()} possui vínculos que impedem o arquivamento.`,
            variant: "destructive",
          });
          return false;
        }
      }

      // [Lote 4B.1] RPC soft_delete_with_audit ausente — feature indisponível.
      console.warn(`[${entityName}] softDelete indisponível: RPC soft_delete_with_audit não provisionada.`);
      toast({
        title: "Funcionalidade indisponível",
        description: `O arquivamento auditado de ${entityName.toLowerCase()} ainda não está disponível.`,
        variant: "destructive",
      });
      return false;
      const { error } = await supabase.rpc('soft_delete_with_audit', {
        p_tabela_nome: tableName,
        p_registro_id: id,
        p_dados_antigos: entityData ? JSON.stringify(entityData) : null
      });

      if (error) {
        console.error(`[${entityName}] Erro no soft delete:`, error);
        
        if (error.message.includes('possui vínculos') || error.message.includes('foreign key')) {
          toast({
            title: "Operação não permitida",
            description: `Não é possível arquivar este ${entityName.toLowerCase()} pois possui vínculos com outros dados.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao arquivar",
            description: error.message,
            variant: "destructive",
          });
        }
        return false;
      }

      console.log(`[${entityName}] Soft delete realizado com sucesso`);
      toast({
        title: "Sucesso",
        description: `${entityName} arquivado com sucesso!`,
      });

      // Recarregar dados ativos
      await fetchActive();
      return true;
    } catch (err: any) {
      console.error(`[${entityName}] Erro inesperado no soft delete:`, err);
      toast({
        title: "Erro",
        description: `Erro inesperado ao arquivar ${entityName.toLowerCase()}`,
        variant: "destructive",
      });
      return false;
    }
  }, [tableName, entityName, validateBeforeDelete, toast, fetchActive]);

  const restore = useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log(`[${entityName}] Restaurando registro ID:`, id);
      
      // Usar any para evitar erro de tipo específico do Supabase
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) {
        console.error(`[${entityName}] Erro ao restaurar:`, error);
        toast({
          title: "Erro ao restaurar",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      console.log(`[${entityName}] Registro restaurado com sucesso`);
      toast({
        title: "Sucesso",
        description: `${entityName} restaurado com sucesso!`,
      });

      return true;
    } catch (err: any) {
      console.error(`[${entityName}] Erro inesperado na restauração:`, err);
      toast({
        title: "Erro",
        description: `Erro inesperado ao restaurar ${entityName.toLowerCase()}`,
        variant: "destructive",
      });
      return false;
    }
  }, [tableName, entityName, toast]);

  return {
    entities,
    loading,
    error,
    softDelete,
    restore,
    fetchActive,
    fetchArchived,
    fetchAll,
  };
};
