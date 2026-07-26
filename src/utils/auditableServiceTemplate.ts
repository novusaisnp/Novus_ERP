
import { supabase } from '@/integrations/supabase/client';

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

  // Template genérico por design: aceita qualquer nome de tabela em runtime, o que o
  // client tipado do Supabase não consegue expressar (.from() exige union literal).
  // Cast único aqui propaga 'any' por toda a cadeia (.select/.insert/.update/...),
  // em vez de repetir o cast em cada método.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private query(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabase.from(this.tableName as any);
  }

  /**
   * Busca apenas registros ativos (não arquivados)
   */
  async getActive(): Promise<T[]> {
    console.log(`[${this.entityName}Service] Buscando registros ativos`);
    
    const { data, error } = await this.query()
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
    
    const { data, error } = await this.query()
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
    
    const { data, error } = await this.query()
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
    
    let query = this.query()
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
    
    const { data, error } = await this.query()
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

    const { data, error } = await this.query()
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
    const err = new Error(`Arquivamento auditado indisponível para ${this.entityName}.`) as Error & { code?: string };
    err.code = 'FEATURE_UNAVAILABLE';
    throw err;

    console.log(`[${this.entityName}Service] Soft delete executado com sucesso`);
  }

  /**
   * Restaura registro arquivado
   */
  async restore(id: string): Promise<T> {
    console.log(`[${this.entityName}Service] Restaurando registro: ${id}`);
    
    const { data, error } = await this.query()
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
