// FIN-E1: leitura dos catálogos globais de pagamento (modalidades/naturezas).
// Somente leitura nesta fase; escrita/administração virá em lotes futuros.

import { supabase as _supabase } from '@/integrations/supabase/client';
import type {
  ModalidadePagamento,
  NaturezaPagamento,
} from '@/types/pagamento';

const supabase: any = _supabase;

export const pagamentoCatalogoService = {
  async listarModalidades(apenasAtivos = true): Promise<ModalidadePagamento[]> {
    let q = supabase
      .from('modalidades_pagamento')
      .select('*')
      .is('deleted_at', null);
    if (apenasAtivos) q = q.eq('ativo', true);
    const { data, error } = await q.order('ordem');
    if (error) {
      console.error('[pagamentoCatalogoService] modalidades:', error);
      throw error;
    }
    return (data ?? []) as ModalidadePagamento[];
  },

  async listarNaturezas(apenasAtivos = true): Promise<NaturezaPagamento[]> {
    let q = supabase
      .from('naturezas_pagamento')
      .select('*')
      .is('deleted_at', null);
    if (apenasAtivos) q = q.eq('ativo', true);
    const { data, error } = await q.order('ordem');
    if (error) {
      console.error('[pagamentoCatalogoService] naturezas:', error);
      throw error;
    }
    return (data ?? []) as NaturezaPagamento[];
  },
};
