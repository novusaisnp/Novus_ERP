import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

export interface Beneficio {
  id: string;
  colaborador_id: string;
  nome: string;
  tipo: string | null;
  valor: number | null;
  percentual: number | null;
  desconta_folha: boolean | null;
  empresa_paga: boolean | null;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  ativo: boolean | null;
  observacoes: string | null;
}

export interface BeneficioInput {
  colaborador_id: string;
  nome: string;
  tipo: string | null;
  valor: number | null;
  percentual: number | null;
  desconta_folha: boolean;
  empresa_paga: boolean;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  ativo: boolean;
  observacoes: string | null;
}

export const beneficioVinculadoService = {
  async listBeneficios(): Promise<Beneficio[]> {
    const empresaId = await getEmpresaAtivaId();
    const { data, error } = await supabase
      .from('beneficios_vinculados')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async criarBeneficio(input: BeneficioInput): Promise<void> {
    const empresaId = await getEmpresaAtivaId();
    if (!empresaId) throw new Error('Empresa não encontrada');

    const { error } = await supabase
      .from('beneficios_vinculados')
      .insert({ ...input, empresa_representada_id: empresaId });
    if (error) throw error;
  },

  async atualizarBeneficio(id: string, input: BeneficioInput): Promise<void> {
    const empresaId = await getEmpresaAtivaId();
    const { error } = await supabase.from('beneficios_vinculados').update(input).eq('id', id).eq('empresa_representada_id', empresaId);
    if (error) throw error;
  },

  async excluirBeneficio(id: string): Promise<void> {
    const empresaId = await getEmpresaAtivaId();
    const { error } = await supabase.from('beneficios_vinculados').delete().eq('id', id).eq('empresa_representada_id', empresaId);
    if (error) throw error;
  },
};
