
import { buildContasPagarQuery, getContaPagarByIdQuery, getEstatisticasQuery, type Paginacao } from './contasPagar/contasPagarQueries';
import { transformFromSupabase } from './contasPagar/contasPagarTransforms';
import { createContaPagar, updateContaPagar, deleteContaPagar } from './contasPagar/contasPagarOperations';
import { dbStatusPagarToUi } from '@/lib/statusMappers';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

import type {
  ContaPagar,
  ContaPagarInput,
  ContaPagarFilters,
  ContaPagarEstatisticas
} from '@/types/contasPagar';

export const contasPagarService = {
  async getAll(filtros: ContaPagarFilters = {}, paginacao?: Paginacao): Promise<{ data: ContaPagar[]; total: number }> {

    const empresaId = await getEmpresaAtivaIdOuFalha();
    const query = buildContasPagarQuery(filtros, empresaId, paginacao);
    const { data, error, count } = await query;

    if (error) {
      console.error('[ContasPagar] Erro ao buscar contas a pagar:', error);
      throw new Error(`Erro ao buscar contas a pagar: ${error.message}`);
    }

    return { data: data.map(transformFromSupabase), total: paginacao ? (count ?? 0) : data.length };
  },

  async getById(id: string): Promise<ContaPagar | null> {
    
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await getContaPagarByIdQuery(id, empresaId);

    if (error) {
      console.error('[ContasPagar] Erro ao buscar conta a pagar:', error);
      throw new Error(`Erro ao buscar conta a pagar: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  async create(input: ContaPagarInput): Promise<ContaPagar> {

    const data = await createContaPagar(input);
    return transformFromSupabase(data);
  },

  async update(id: string, input: ContaPagarInput): Promise<ContaPagar> {

    const data = await updateContaPagar(id, input);
    return transformFromSupabase(data);
  },

  async delete(id: string): Promise<void> {

    await deleteContaPagar(id);
  },

  async getEstatisticas(filtros: ContaPagarFilters = {}): Promise<ContaPagarEstatisticas> {

    const empresaId = await getEmpresaAtivaIdOuFalha();
    const query = getEstatisticasQuery(filtros, empresaId);
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

    data.forEach((conta: any) => {
      const situacao = dbStatusPagarToUi(conta.status ?? conta.situacao);
      const valorAtual = Math.max(
        Number(conta.valor_original || 0) - Number(conta.valor_pago || 0),
        0,
      );
      switch (situacao) {
        case 'ABERTA':
          estatisticas.contas_abertas++;
          estatisticas.valor_total_aberto += valorAtual;
          break;
        case 'VENCIDA':
          estatisticas.contas_vencidas++;
          estatisticas.valor_total_vencido += valorAtual;
          break;
        case 'PAGA':
          estatisticas.contas_pagas++;
          estatisticas.valor_total_pago += valorAtual;
          break;
      }
    });


    return estatisticas;
  },
};
