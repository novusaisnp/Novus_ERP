
import { buildContasPagarQuery, getContaPagarByIdQuery, getEstatisticasQuery } from './contasPagar/contasPagarQueries';
import { transformFromSupabase } from './contasPagar/contasPagarTransforms';
import { createContaPagar, updateContaPagar, deleteContaPagar } from './contasPagar/contasPagarOperations';
import type { 
  ContaPagar, 
  ContaPagarInput, 
  ContaPagarFilters, 
  ContaPagarEstatisticas 
} from '@/types/contasPagar';

export const contasPagarService = {
  async getAll(filtros: ContaPagarFilters = {}): Promise<ContaPagar[]> {
    console.log('[ContasPagar] Buscando todas as contas a pagar com filtros:', filtros);
    
    const query = buildContasPagarQuery(filtros);
    const { data, error } = await query;

    if (error) {
      console.error('[ContasPagar] Erro ao buscar contas a pagar:', error);
      throw new Error(`Erro ao buscar contas a pagar: ${error.message}`);
    }

    return data.map(transformFromSupabase);
  },

  async getById(id: string): Promise<ContaPagar | null> {
    console.log('[ContasPagar] Buscando conta a pagar por ID:', id);
    
    const { data, error } = await getContaPagarByIdQuery(id);

    if (error) {
      console.error('[ContasPagar] Erro ao buscar conta a pagar:', error);
      throw new Error(`Erro ao buscar conta a pagar: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  async create(input: ContaPagarInput): Promise<ContaPagar> {
    console.log('[ContasPagar] Criando nova conta a pagar:', input);

    const data = await createContaPagar(input);
    console.log('[ContasPagar] Conta a pagar criada com sucesso:', data);
    return transformFromSupabase(data);
  },

  async update(id: string, input: ContaPagarInput): Promise<ContaPagar> {
    console.log('[ContasPagar] Atualizando conta a pagar:', id, input);

    const data = await updateContaPagar(id, input);
    console.log('[ContasPagar] Conta a pagar atualizada com sucesso:', data);
    return transformFromSupabase(data);
  },

  async delete(id: string): Promise<void> {
    console.log('[ContasPagar] Removendo conta a pagar:', id);

    await deleteContaPagar(id);
    console.log('[ContasPagar] Conta a pagar removida com sucesso');
  },

  async getEstatisticas(filtros: ContaPagarFilters = {}): Promise<ContaPagarEstatisticas> {
    console.log('[ContasPagar] Calculando estatísticas com filtros:', filtros);

    const query = getEstatisticasQuery(filtros);
    const { data, error } = await query;

    if (error) {
      console.error('[ContasPagar] Erro ao calcular estatísticas:', error);
      throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
    }

    const estatisticas: ContaPagarEstatisticas = {
      total_contas: data.length,
      contas_abertas: 0,
      contas_vencidas: 0,
      contas_pagas: 0,
      valor_total_aberto: 0,
      valor_total_vencido: 0,
      valor_total_pago: 0,
    };

    data.forEach(conta => {
      switch (conta.situacao) {
        case 'ABERTA':
          estatisticas.contas_abertas++;
          estatisticas.valor_total_aberto += conta.valor_atual;
          break;
        case 'VENCIDA':
          estatisticas.contas_vencidas++;
          estatisticas.valor_total_vencido += conta.valor_atual;
          break;
        case 'PAGA':
          estatisticas.contas_pagas++;
          estatisticas.valor_total_pago += conta.valor_atual;
          break;
      }
    });

    return estatisticas;
  },
};
