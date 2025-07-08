
import { AuditableServiceTemplate } from '@/utils/auditableServiceTemplate';
import type { CentroCusto, CentroCustoInput } from '@/types/configuracoes';

/**
 * Serviço para Centros de Custo com proteção automática
 * Exemplo de como migrar serviços existentes para o padrão auditável
 */
class AuditableCentroCustoService extends AuditableServiceTemplate<CentroCusto> {
  constructor() {
    super('centros_custo', 'Centro de Custo');
  }

  /**
   * Implementação específica para validar restrições antes do arquivamento
   */
  async hasRestrictions(id: string): Promise<boolean> {
    console.log(`[CentroCustoService] Verificando restrições para centro de custo: ${id}`);
    
    try {
      // Verificar se há lançamentos vinculados a este centro de custo
      // TODO: Implementar verificação com outras tabelas quando necessário
      
      // Exemplo: verificar se há colaboradores vinculados
      // const { count } = await supabase
      //   .from('colaboradores')
      //   .select('id', { count: 'exact' })
      //   .eq('centro_custo_id', id)
      //   .is('deleted_at', null);
      
      // return (count || 0) > 0;
      
      return false; // Por enquanto, não há restrições específicas
    } catch (error) {
      console.error(`[CentroCustoService] Erro ao verificar restrições:`, error);
      return true; // Em caso de erro, bloquear por segurança
    }
  }

  /**
   * Método personalizado para criar centro de custo com validações específicas
   */
  async createCentroCusto(input: CentroCustoInput): Promise<CentroCusto> {
    console.log(`[CentroCustoService] Criando centro de custo:`, input.nome);

    // Validações específicas podem ser adicionadas aqui
    if (!input.nome?.trim()) {
      throw new Error('Nome do centro de custo é obrigatório');
    }

    return await this.create(input);
  }

  /**
   * Método personalizado para atualizar centro de custo
   */
  async updateCentroCusto(id: string, input: CentroCustoInput): Promise<CentroCusto> {
    console.log(`[CentroCustoService] Atualizando centro de custo:`, id);

    // Validações específicas podem ser adicionadas aqui
    if (!input.nome?.trim()) {
      throw new Error('Nome do centro de custo é obrigatório');
    }

    return await this.update(id, input);
  }

  /**
   * Método personalizado para arquivar com validações específicas
   */
  async arquivarCentroCusto(id: string): Promise<void> {
    console.log(`[CentroCustoService] Arquivando centro de custo:`, id);

    const hasRestrictions = await this.hasRestrictions(id);
    if (hasRestrictions) {
      throw new Error('Não é possível arquivar este centro de custo pois possui vínculos ativos');
    }

    await this.softDelete(id);
  }
}

// Instância singleton
export const auditableCentroCustoService = new AuditableCentroCustoService();
