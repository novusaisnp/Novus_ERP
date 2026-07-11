
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;

/**
 * Template genérico para serviços de entidades auditáveis
 * Fornece métodos padronizados com proteção automática
 */
export class AuditableServiceTemplate<T extends { id: string; deleted_at?: string | null }> {
  protected tableName: string;
  protected entityName: string;

  constructor(tableName: string, entityName: string) {
    this.tableName = tableName;
    this.entityName = entityName;
    console.log(`[${this.entityName}Service] Serviço auditável inicializado para tabela: ${this.tableName}`);
  }

  /**
   * Busca apenas registros ativos (não arquivados)
   */
  async getActive(): Promise<T[]> {
    console.log(`[${this.entityName}Service] Buscando registros ativos`);
    
    // Usar any para evitar erro de tipo específico do Supabase
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao buscar ativos:`, error);
      throw error;
    }

    console.log(`[${this.entityName}Service] ${data?.length || 0} registros ativos encontrados`);
    return data as T[];
  }

  /**
   * Busca apenas registros arquivados
   */
  async getArchived(): Promise<T[]> {
    console.log(`[${this.entityName}Service] Buscando registros arquivados`);
    
    // Usar any para evitar erro de tipo específico do Supabase
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao buscar arquivados:`, error);
      throw error;
    }

    console.log(`[${this.entityName}Service] ${data?.length || 0} registros arquivados encontrados`);
    return data as T[];
  }

  /**
   * Busca todos os registros (ativos + arquivados)
   */
  async getAll(): Promise<T[]> {
    console.log(`[${this.entityName}Service] Buscando todos os registros`);
    
    // Usar any para evitar erro de tipo específico do Supabase
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao buscar todos:`, error);
      throw error;
    }

    console.log(`[${this.entityName}Service] ${data?.length || 0} registros totais encontrados`);
    return data as T[];
  }

  /**
   * Busca registro por ID (apenas ativos por padrão)
   */
  async getById(id: string, includeArchived = false): Promise<T | null> {
    console.log(`[${this.entityName}Service] Buscando por ID: ${id}`);
    
    // Usar any para evitar erro de tipo específico do Supabase
    let query = (supabase as any)
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    if (!includeArchived) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao buscar por ID:`, error);
      throw error;
    }

    return data as T | null;
  }

  /**
   * Cria novo registro (com auditoria automática via trigger)
   */
  async create(input: Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<T> {
    console.log(`[${this.entityName}Service] Criando novo registro`);
    
    // Usar any para evitar erro de tipo específico do Supabase
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao criar:`, error);
      throw error;
    }

    console.log(`[${this.entityName}Service] Registro criado com sucesso: ${data.id}`);
    return data as T;
  }

  /**
   * Atualiza registro (com auditoria automática via trigger)
   */
  async update(id: string, input: Partial<Omit<T, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>>): Promise<T> {
    console.log(`[${this.entityName}Service] Atualizando registro: ${id}`);
    
    const updateData = {
      ...input,
      updated_at: new Date().toISOString()
    };

    // Usar any para evitar erro de tipo específico do Supabase
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao atualizar:`, error);
      throw error;
    }

    console.log(`[${this.entityName}Service] Registro atualizado com sucesso`);
    return data as T;
  }

  /**
   * Soft delete usando função SQL com auditoria
   * [Lote 4B.1] RPC soft_delete_with_audit ausente no backend — lança erro estruturado.
   */
  async softDelete(id: string): Promise<void> {
    console.warn(`[${this.entityName}Service] softDelete indisponível: RPC soft_delete_with_audit não provisionada.`);
    const err = new Error(`Arquivamento auditado indisponível para ${this.entityName}.`);
    (err as any).code = 'FEATURE_UNAVAILABLE';
    throw err;

    console.log(`[${this.entityName}Service] Soft delete executado com sucesso`);
  }

  /**
   * Restaura registro arquivado
   */
  async restore(id: string): Promise<T> {
    console.log(`[${this.entityName}Service] Restaurando registro: ${id}`);
    
    // Usar any para evitar erro de tipo específico do Supabase
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .update({ 
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[${this.entityName}Service] Erro ao restaurar:`, error);
      throw error;
    }

    console.log(`[${this.entityName}Service] Registro restaurado com sucesso`);
    return data as T;
  }

  /**
   * Verifica se registro possui vínculos que impedem arquivamento
   */
  async hasRestrictions(id: string): Promise<boolean> {
    // Override this method in specific services to implement custom validation
    console.log(`[${this.entityName}Service] Verificação de restrições padrão para: ${id}`);
    return false;
  }
}

/**
 * Factory function para criar serviços auditáveis rapidamente
 */
export const createAuditableService = <T extends { id: string; deleted_at?: string | null }>(
  tableName: string,
  entityName: string
) => {
  return new AuditableServiceTemplate<T>(tableName, entityName);
};
