// FIN-E2: serviço de política de pagamento/crédito por cliente
import { supabase } from '@/integrations/supabase/client';
import type {
  ClientePoliticaPagamento,
  ClientePoliticaInput,
  ClienteModalidadeBloqueada,
} from '@/types/clientePolitica';


export function friendlyError(error: any): string {
  const code = error?.code || error?.details?.code;
  const msg = error?.message || '';
  if (code === '42501' || /permission denied|row-level security/i.test(msg)) {
    return 'Você não tem permissão para executar esta ação.';
  }
  if (code === '23505') return 'Registro duplicado (já existe entrada para este cliente/modalidade).';
  if (code === '23503') return 'Referência inválida (cliente ou modalidade não encontrada).';
  if (code === '23514') return 'Valor inválido (violação de regra de validação).';
  if (code === 'P0001') return msg || 'Regra de negócio violada.';
  return msg || 'Erro inesperado ao acessar a política de pagamento.';
}

export const clientePoliticaService = {
  async getByCliente(clienteId: string): Promise<ClientePoliticaPagamento | null> {
    const { data, error } = await supabase
      .from('cliente_politica_pagamento')
      .select('*')
      .eq('cliente_id', clienteId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw new Error(friendlyError(error));
    return (data as ClientePoliticaPagamento) ?? null;
  },

  async upsert(payload: ClientePoliticaInput): Promise<ClientePoliticaPagamento> {
    const { data, error } = await supabase
      .from('cliente_politica_pagamento')
      .upsert(payload, { onConflict: 'cliente_id' })
      .select()
      .single();
    if (error) throw new Error(friendlyError(error));
    return data as ClientePoliticaPagamento;
  },

  async listModalidadesBloqueadas(clienteId: string): Promise<ClienteModalidadeBloqueada[]> {
    const { data, error } = await supabase
      .from('cliente_modalidades_bloqueadas')
      .select('*')
      .eq('cliente_id', clienteId);
    if (error) throw new Error(friendlyError(error));
    return (data as ClienteModalidadeBloqueada[]) ?? [];
  },

  async addModalidadeBloqueada(params: {
    empresa_representada_id: string;
    cliente_id: string;
    modalidade_id: string;
    motivo?: string | null;
  }): Promise<ClienteModalidadeBloqueada> {
    const { data, error } = await supabase
      .from('cliente_modalidades_bloqueadas')
      .insert({
        empresa_representada_id: params.empresa_representada_id,
        cliente_id: params.cliente_id,
        modalidade_id: params.modalidade_id,
        motivo: params.motivo ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(friendlyError(error));
    return data as ClienteModalidadeBloqueada;
  },

  async removeModalidadeBloqueada(clienteId: string, modalidadeId: string): Promise<void> {
    const { error } = await supabase
      .from('cliente_modalidades_bloqueadas')
      .delete()
      .eq('cliente_id', clienteId)
      .eq('modalidade_id', modalidadeId);
    if (error) throw new Error(friendlyError(error));
  },
};
