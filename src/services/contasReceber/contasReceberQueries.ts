
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import type { ContaReceberFilters } from '@/types/contasReceber';

export const buildContasReceberQuery = (filtros: ContaReceberFilters = {}) => {
  console.log('[ContasReceberQueries] Construindo query com filtros:', filtros);
  
  let query = supabase
    .from('contas_receber')
    .select(`
      *,
      cliente:clientes(id, nome, cpf_cnpj),
      venda:vendas(id, numero_venda),
      contrato:contratos(id, numero_contrato)
    `)
    .order('data_vencimento', { ascending: false });

  // Filtro por busca (número documento, cliente)
  if (filtros.busca) {
    query = query.or(`numero_documento.ilike.%${filtros.busca}%,clientes.nome.ilike.%${filtros.busca}%`);
  }

  // Filtro por situação
  if (filtros.situacao) {
    query = query.eq('situacao', filtros.situacao);
  }

  // Filtro por cliente
  if (filtros.cliente_id) {
    query = query.eq('cliente_id', filtros.cliente_id);
  }

  // Filtro por forma de pagamento
  if (filtros.forma_pagamento) {
    query = query.eq('forma_pagamento', filtros.forma_pagamento);
  }

  // Filtro por data de vencimento (início)
  if (filtros.data_vencimento_inicio) {
    query = query.gte('data_vencimento', filtros.data_vencimento_inicio);
  }

  // Filtro por data de vencimento (fim)
  if (filtros.data_vencimento_fim) {
    query = query.lte('data_vencimento', filtros.data_vencimento_fim);
  }

  // Filtro por valor mínimo
  if (filtros.valor_min) {
    query = query.gte('valor_original', filtros.valor_min);
  }

  // Filtro por valor máximo
  if (filtros.valor_max) {
    query = query.lte('valor_original', filtros.valor_max);
  }

  return query;
};

export const getContaReceberByIdQuery = (id: string) => {
  console.log('[ContasReceberQueries] Buscando conta por ID:', id);
  
  return supabase
    .from('contas_receber')
    .select(`
      *,
      cliente:clientes(id, nome, cpf_cnpj),
      venda:vendas(id, numero_venda),
      contrato:contratos(id, numero_contrato)
    `)
    .eq('id', id)
    .single();
};

export const getEstatisticasQuery = (filtros: ContaReceberFilters = {}) => {
  console.log('[ContasReceberQueries] Buscando estatísticas com filtros:', filtros);
  
  let query = supabase
    .from('contas_receber')
    .select('situacao, valor_original, valor_pago');

  // Aplicar os mesmos filtros das consultas principais
  if (filtros.situacao) {
    query = query.eq('situacao', filtros.situacao);
  }

  if (filtros.cliente_id) {
    query = query.eq('cliente_id', filtros.cliente_id);
  }

  if (filtros.forma_pagamento) {
    query = query.eq('forma_pagamento', filtros.forma_pagamento);
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
