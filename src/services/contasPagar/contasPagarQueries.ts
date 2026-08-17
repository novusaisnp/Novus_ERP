
import { supabase } from '@/integrations/supabase/client';
import { uiStatusPagarToDb } from '@/lib/statusMappers';
import type { ContaPagarFilters } from '@/types/contasPagar';

export interface Paginacao {
  page: number; // 0-based
  pageSize: number;
}

export const buildContasPagarQuery = (
  filtros: ContaPagarFilters = {},
  empresaId: string,
  paginacao?: Paginacao,
) => {

  let query = supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores:entidades!contas_pagar_fornecedor_id_fkey (
        id,
        razao_social,
        nome_fantasia
      ),
      plano_contas (
          id,
          codigo,
          nome,
          tipo
        ),
      centros_custo (
        id,
        nome,
        codigo
      ),
      rateios_contas_pagar (
        id,
        plano_conta_id,
        centro_custo_id,
        valor,
        percentual,
        plano_contas (
          id,
          codigo,
          nome,
          tipo
        ),
        centros_custo (
          id,
          nome,
          codigo
        )
      )
    `, { count: paginacao ? 'exact' : undefined })
    .is('deleted_at', null)
    .eq('empresa_representada_id', empresaId)
    .order('data_vencimento', { ascending: false });

  // Aplicar filtros
  if (filtros.busca) {
    query = query.or(`numero_documento.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
  }

  if (filtros.situacao) {
    query = query.eq('status', uiStatusPagarToDb(filtros.situacao));
  }

  if (filtros.fornecedor_id) {
    query = query.eq('fornecedor_id', filtros.fornecedor_id);
  }

  if (filtros.data_vencimento_inicio) {
    query = query.gte('data_vencimento', filtros.data_vencimento_inicio);
  }

  if (filtros.data_vencimento_fim) {
    query = query.lte('data_vencimento', filtros.data_vencimento_fim);
  }

  if (filtros.valor_min) {
    query = query.gte('valor_original', filtros.valor_min);
  }

  if (filtros.valor_max) {
    query = query.lte('valor_original', filtros.valor_max);
  }

  if (paginacao) {
    const from = paginacao.page * paginacao.pageSize;
    const to = from + paginacao.pageSize - 1;
    query = query.range(from, to);
  }

  return query;
};

export const getContaPagarByIdQuery = (id: string, empresaId: string) => {

  return supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores:entidades!contas_pagar_fornecedor_id_fkey (
        id,
        razao_social,
        nome_fantasia
      ),
      plano_contas (
          id,
          codigo,
          nome,
          tipo
        ),
      centros_custo (
        id,
        nome,
        codigo
      ),
      rateios_contas_pagar (
        id,
        plano_conta_id,
        centro_custo_id,
        valor,
        percentual,
        plano_contas (
          id,
          codigo,
          nome,
          tipo
        ),
        centros_custo (
          id,
          nome,
          codigo
        )
      )
    `)
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .is('deleted_at', null)
    .single();
};

export const getEstatisticasQuery = (filtros: ContaPagarFilters = {}, empresaId: string) => {

  let query = supabase
    .from('contas_pagar')
    .select('status, valor_original, valor_pago')
    .is('deleted_at', null)
    .eq('empresa_representada_id', empresaId);

  // Aplicar os mesmos filtros da listagem
  if (filtros.busca) {
    query = query.or(`numero_documento.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
  }

  if (filtros.situacao) {
    query = query.eq('status', uiStatusPagarToDb(filtros.situacao));
  }

  if (filtros.fornecedor_id) {
    query = query.eq('fornecedor_id', filtros.fornecedor_id);
  }

  if (filtros.data_vencimento_inicio) {
    query = query.gte('data_vencimento', filtros.data_vencimento_inicio);
  }

  if (filtros.data_vencimento_fim) {
    query = query.lte('data_vencimento', filtros.data_vencimento_fim);
  }

  if (filtros.valor_min) {
    query = query.gte('valor_original', filtros.valor_min);
  }

  if (filtros.valor_max) {
    query = query.lte('valor_original', filtros.valor_max);
  }

  return query;
};
