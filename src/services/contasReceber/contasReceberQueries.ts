import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import type { ContaReceberFilters } from '@/types/contasReceber';
import { normalizarStatus } from './contasReceberTransforms';

const aplicarFiltrosComuns = (query: any, filtros: ContaReceberFilters) => {
  // Soft delete: nunca retornar removidos
  query = query.is('deleted_at', null);

  if (filtros.busca) {
    // Escapar caracteres perigosos para .or()
    const termo = filtros.busca.replace(/[,()]/g, '');
    query = query.or(
      `numero_documento.ilike.%${termo}%,descricao.ilike.%${termo}%`,
    );
  }

  if (filtros.situacao) {
    query = query.eq('status', normalizarStatus(filtros.situacao));
  }

  if (filtros.cliente_id) {
    query = query.eq('cliente_id', filtros.cliente_id);
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

  if (filtros.venda_id) {
    query = query.eq('venda_id', filtros.venda_id);
  }

  return query;
};

const selectComRelacionamentos = `
  *,
  cliente:clientes(id, nome, cpf, cnpj),
  rateios:rateios_contas_receber (
    id,
    plano_conta_id,
    centro_custo_id,
    valor,
    percentual,
    observacoes,
    plano_conta:plano_contas (id, codigo, nome),
    centro_custo:centros_custo (id, nome, codigo)
  )
`;

export const buildContasReceberQuery = (filtros: ContaReceberFilters = {}) => {
  let query = supabase
    .from('contas_receber')
    .select(selectComRelacionamentos)
    .order('data_vencimento', { ascending: false });

  return aplicarFiltrosComuns(query, filtros);
};

export const getContaReceberByIdQuery = (id: string) => {
  return supabase
    .from('contas_receber')
    .select(selectComRelacionamentos)
    .eq('id', id)
    .is('deleted_at', null)
    .single();
};

export const getEstatisticasQuery = (filtros: ContaReceberFilters = {}) => {
  let query = supabase
    .from('contas_receber')
    .select('status, valor_original, valor_recebido, data_vencimento');
  return aplicarFiltrosComuns(query, filtros);
};
