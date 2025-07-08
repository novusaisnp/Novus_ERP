
import { supabase } from '@/integrations/supabase/client';

export const buildContasPagarQuery = (filtros: any = {}) => {
  console.log('[ContasPagarQueries] Construindo query com filtros:', filtros);
  
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
        nome
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
        descricao,
        plano_contas (
          id,
          codigo,
          nome
        ),
        centros_custo (
          id,
          nome,
          codigo
        )
      )
    `)
    .eq('ativo', true)
    .order('data_vencimento', { ascending: false });

  // Aplicar filtros
  if (filtros.busca) {
    query = query.or(`numero_documento.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
  }

  if (filtros.situacao) {
    query = query.eq('situacao', filtros.situacao);
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
    query = query.gte('valor_atual', filtros.valor_min);
  }

  if (filtros.valor_max) {
    query = query.lte('valor_atual', filtros.valor_max);
  }

  return query;
};

export const getContaPagarByIdQuery = (id: string) => {
  console.log('[ContasPagarQueries] Construindo query para ID:', id);
  
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
        nome
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
        descricao,
        plano_contas (
          id,
          codigo,
          nome
        ),
        centros_custo (
          id,
          nome,
          codigo
        )
      )
    `)
    .eq('id', id)
    .eq('ativo', true)
    .single();
};

export const getEstatisticasQuery = (filtros: any = {}) => {
  console.log('[ContasPagarQueries] Construindo query de estatísticas com filtros:', filtros);
  
  let query = supabase
    .from('contas_pagar')
    .select('situacao, valor_atual')
    .eq('ativo', true);

  // Aplicar os mesmos filtros da listagem
  if (filtros.busca) {
    query = query.or(`numero_documento.ilike.%${filtros.busca}%,descricao.ilike.%${filtros.busca}%`);
  }

  if (filtros.situacao) {
    query = query.eq('situacao', filtros.situacao);
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
    query = query.gte('valor_atual', filtros.valor_min);
  }

  if (filtros.valor_max) {
    query = query.lte('valor_atual', filtros.valor_max);
  }

  return query;
};
