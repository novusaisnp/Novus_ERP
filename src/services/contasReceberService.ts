
import { buildContasReceberQuery, getContaReceberByIdQuery, getEstatisticasQuery } from './contasReceber/contasReceberQueries';
import { transformFromSupabase } from './contasReceber/contasReceberTransforms';
import { createContaReceber, updateContaReceber, deleteContaReceber } from './contasReceber/contasReceberOperations';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';
import type { 
  ContaReceber, 
  ContaReceberInput, 
  ContaReceberFilters, 
  ContaReceberEstatisticas 
} from '@/types/contasReceber';

export const contasReceberService = {
  async getAll(filtros: ContaReceberFilters = {}): Promise<ContaReceber[]> {
    
    try {
      const empresaId = await getEmpresaAtivaIdOuFalha();
      const query = buildContasReceberQuery(filtros, empresaId);
      const { data, error } = await query;

      if (error) {
        console.error('[ContasReceber] Erro ao buscar contas a receber:', error);
        throw new Error(`Erro ao buscar contas a receber: ${error.message}`);
      }

      // Retorna array vazio se não há dados, evitando erros
      if (!data || data.length === 0) {
        return [];
      }

      return data.map(transformFromSupabase);
    } catch (error) {
      console.error('[ContasReceber] Erro no service getAll:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<ContaReceber | null> {
    
    try {
      const empresaId = await getEmpresaAtivaIdOuFalha();
      const { data, error } = await getContaReceberByIdQuery(id, empresaId);

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

    try {
      const data = await createContaReceber(input);
      return transformFromSupabase(data);
    } catch (error) {
      console.error('[ContasReceber] Erro no service create:', error);
      throw error;
    }
  },

  async update(id: string, input: ContaReceberInput): Promise<ContaReceber> {

    try {
      const data = await updateContaReceber(id, input);
      return transformFromSupabase(data);
    } catch (error) {
      console.error('[ContasReceber] Erro no service update:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {

    try {
      await deleteContaReceber(id);
    } catch (error) {
      console.error('[ContasReceber] Erro no service delete:', error);
      throw error;
    }
  },

  async getEstatisticas(filtros: ContaReceberFilters = {}): Promise<ContaReceberEstatisticas> {

    try {
      const empresaId = await getEmpresaAtivaIdOuFalha();
      const query = getEstatisticasQuery(filtros, empresaId);
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
        return estatisticas;
      }

      // Calcular estatísticas usando o schema real (status/valor_recebido)
      const hoje = new Date().toISOString().slice(0, 10);
      estatisticas.total_contas = data.length;

      data.forEach((conta: any) => {
        const valor = Number(conta.valor_original) || 0;
        const recebido = Number(conta.valor_recebido) || 0;
        const status = String(conta.status || '').toUpperCase();
        const venceu = conta.data_vencimento && conta.data_vencimento < hoje;

        if (status === 'RECEBIDO') {
          estatisticas.contas_recebidas++;
          estatisticas.valor_total_recebido += recebido || valor;
        } else if (status === 'VENCIDO' || (status === 'PENDENTE' && venceu)) {
          estatisticas.contas_vencidas++;
          estatisticas.valor_total_vencido += valor;
        } else if (status === 'PENDENTE' || status === 'PARCIAL') {
          estatisticas.contas_abertas++;
          estatisticas.valor_total_aberto += valor - recebido;
        }
      });


      return estatisticas;
    } catch (error) {
      console.error('[ContasReceber] Erro no service getEstatisticas:', error);
      throw error;
    }
  },
};
