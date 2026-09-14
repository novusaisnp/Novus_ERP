import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

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
    const empresaId = await getEmpresaAtivaId();
    const { data, error } = await supabase
      .from('folha_pagamento')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .order('competencia', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async criarFolha(input: NovaFolhaInput): Promise<void> {
    const empresaId = await getEmpresaAtivaId();
    if (!empresaId) throw new Error('Empresa não encontrada');

    const { error } = await supabase.from('folha_pagamento').insert({
      empresa_representada_id: empresaId,
      ...input,
    });
    if (error) throw error;
  },
};
