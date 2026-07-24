import { supabase } from '@/integrations/supabase/client';

export interface FolhaRow {
  id: string;
  colaborador_id: string;
  competencia: string;
  salario_base: number;
  total_vencimentos: number | null;
  total_descontos: number | null;
  salario_liquido: number | null;
  status: string | null;
  data_pagamento: string | null;
}

export interface NovaFolhaInput {
  colaborador_id: string;
  competencia: string;
  salario_base: number;
  total_vencimentos: number | null;
  total_descontos: number | null;
  inss: number | null;
  irrf: number | null;
  fgts: number | null;
  status: string;
  observacoes: string | null;
}

export const folhaPagamentoService = {
  async listFolhas(): Promise<FolhaRow[]> {
    const { data, error } = await supabase
      .from('folha_pagamento')
      .select('*')
      .order('competencia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async criarFolha(input: NovaFolhaInput): Promise<void> {
    const { data: empresaId, error: empresaError } = await supabase.rpc('get_user_empresa_id');
    if (empresaError) throw empresaError;
    if (!empresaId) throw new Error('Empresa não encontrada');

    const { error } = await supabase.from('folha_pagamento').insert({
      empresa_representada_id: empresaId,
      ...input,
    });
    if (error) throw error;
  },
};
