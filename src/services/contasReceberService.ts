
import { buildContasReceberQuery, getContaReceberByIdQuery, getEstatisticasQuery } from './contasReceber/contasReceberQueries';
import { transformFromSupabase } from './contasReceber/contasReceberTransforms';
import { createContaReceber, updateContaReceber, deleteContaReceber } from './contasReceber/contasReceberOperations';
import type { 
  ContaReceber, 
  ContaReceberInput, 
  ContaReceberFilters, 
  ContaReceberEstatisticas 
} from '@/types/contasReceber';

export const contasReceberService = {
  async getAll(filtros: ContaReceberFilters = {}): Promise<ContaReceber[]> {
    console.log('[ContasReceber] Buscando todas as contas a receber com filtros:', filtros);
    
    try {
      const query = buildContasReceberQuery(filtros);
      const { data, error } = await query;

      if (error) {
        console.error('[ContasReceber] Erro ao buscar contas a receber:', error);
        throw new Error(`Erro ao buscar contas a receber: ${error.message}`);
      }

      // Retorna array vazio se não há dados, evitando erros
      if (!data || data.length === 0) {
        console.log('[ContasReceber] Nenhuma conta a receber encontrada');
        return [];
      }

      return data.map(transformFromSupabase);
    } catch (error) {
      console.error('[ContasReceber] Erro no service getAll:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<ContaReceber | null> {
    console.log('[ContasReceber] Buscando conta a receber por ID:', id);
    
    try {
      const { data, error } = await getContaReceberByIdQuery(id);

      if (error) {
        console.error('[ContasReceber] Erro ao buscar conta a receber:', error);
        throw new Error(`Erro ao buscar conta a receber: ${error.message}`);
      }

      return data ? transformFromSupabase(data) : null;
    } catch (error) {
      console.error('[ContasReceber] Erro no service getById:', error);
      throw error;
    }
  },

  async create(input: ContaReceberInput): Promise<ContaReceber> {
    console.log('[ContasReceber] Criando nova conta a receber:', input);

    try {
      const data = await createContaReceber(input);
      console.log('[ContasReceber] Conta a receber criada com sucesso:', data);
      return transformFromSupabase(data);
    } catch (error) {
      console.error('[ContasReceber] Erro no service create:', error);
      throw error;
    }
  },

  async update(id: string, input: ContaReceberInput): Promise<ContaReceber> {
    console.log('[ContasReceber] Atualizando conta a receber:', id, input);

    try {
      const data = await updateContaReceber(id, input);
      console.log('[ContasReceber] Conta a receber atualizada com sucesso:', data);
      return transformFromSupabase(data);
    } catch (error) {
      console.error('[ContasReceber] Erro no service update:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    console.log('[ContasReceber] Removendo conta a receber:', id);

    try {
      await deleteContaReceber(id);
      console.log('[ContasReceber] Conta a receber removida com sucesso');
    } catch (error) {
      console.error('[ContasReceber] Erro no service delete:', error);
      throw error;
    }
  },

  async getEstatisticas(filtros: ContaReceberFilters = {}): Promise<ContaReceberEstatisticas> {
    console.log('[ContasReceber] Calculando estatísticas com filtros:', filtros);

    try {
      const query = getEstatisticasQuery(filtros);
      const { data, error } = await query;

      if (error) {
        console.error('[ContasReceber] Erro ao calcular estatísticas:', error);
        throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
      }

      // Inicializar estatísticas zeradas
      const estatisticas: ContaReceberEstatisticas = {
        total_contas: 0,
        contas_abertas: 0,
        contas_vencidas: 0,
        contas_recebidas: 0,
        valor_total_aberto: 0,
        valor_total_vencido: 0,
        valor_total_recebido: 0,
      };

      // Se não há dados, retorna estatísticas zeradas
      if (!data || data.length === 0) {
        console.log('[ContasReceber] Nenhuma conta encontrada para estatísticas');
        return estatisticas;
      }

      // Calcular estatísticas
      estatisticas.total_contas = data.length;

      data.forEach(conta => {
        switch (conta.situacao) {
          case 'ABERTA':
            estatisticas.contas_abertas++;
            estatisticas.valor_total_aberto += Number(conta.valor_original) || 0;
            break;
          case 'VENCIDA':
            estatisticas.contas_vencidas++;
            estatisticas.valor_total_vencido += Number(conta.valor_original) || 0;
            break;
          case 'RECEBIDA':
            estatisticas.contas_recebidas++;
            estatisticas.valor_total_recebido += Number(conta.valor_pago || conta.valor_original) || 0;
            break;
        }
      });

      return estatisticas;
    } catch (error) {
      console.error('[ContasReceber] Erro no service getEstatisticas:', error);
      throw error;
    }
  },
};
