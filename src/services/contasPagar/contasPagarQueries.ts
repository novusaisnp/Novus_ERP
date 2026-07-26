
import { supabase } from '@/integrations/supabase/client';
import { uiStatusPagarToDb } from '@/lib/statusMappers';
import type { ContaPagarFilters } from '@/types/contasPagar';

export const buildContasPagarQuery = (filtros: ContaPagarFilters = {}) => {
  
  let query = supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores (
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
    .is('deleted_at', null)
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

  return query;
};

export const getContaPagarByIdQuery = (id: string) => {
  
  return supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores (
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
    .is('deleted_at', null)
    .single();
};

export const getEstatisticasQuery = (filtros: ContaPagarFilters = {}) => {
  
  let query = supabase
    .from('contas_pagar')
    .select('status, valor_original, valor_pago')
    .is('deleted_at', null);

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
