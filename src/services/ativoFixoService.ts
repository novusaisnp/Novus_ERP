import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';
import type {
  AtivoFixo,
  AtivoFixoInput,
  BaixaAtivoFixoResultado,
  DepreciacaoProcessadaItem,
} from '@/types/ativoFixo';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission/i.test(msg)) {
    return new Error('Sem permissão para esta operação na empresa selecionada');
  }
  if (code === '23502') {
    return new Error('Dados obrigatórios ausentes para salvar o ativo');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const ativoFixoService = {
  async list(): Promise<AtivoFixo[]> {
    const { data, error } = await supabase
      .from('ativos_fixos')
      .select('*')
      .order('data_aquisicao', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar ativos fixos');
    return (data || []) as AtivoFixo[];
  },

  async create(input: AtivoFixoInput): Promise<AtivoFixo> {
    const empresa_representada_id = await getEmpresaId();
    const { data, error } = await supabase
      .from('ativos_fixos')
      .insert([{
        empresa_representada_id,
        nome: input.nome.trim(),
        descricao: input.descricao?.trim() || null,
        categoria: input.categoria?.trim() || null,
        centro_custo_id: input.centro_custo_id || null,
        data_aquisicao: input.data_aquisicao,
        valor_aquisicao: input.valor_aquisicao,
        valor_residual: input.valor_residual,
        vida_util_meses: input.vida_util_meses,
      }])
      .select()
      .single();
    if (error) throw translateError(error, 'Erro ao cadastrar ativo fixo');
    return data as AtivoFixo;
  },

  async processarDepreciacaoMensal(competencia?: string): Promise<DepreciacaoProcessadaItem[]> {
    const empresa_representada_id = await getEmpresaId();
    const { data, error } = await supabase.rpc('processar_depreciacao_mensal', {
      p_empresa_id: empresa_representada_id,
      p_competencia: competencia,
    });
    if (error) throw translateError(error, 'Erro ao processar depreciação');
    return (data || []) as DepreciacaoProcessadaItem[];
  },

  async baixar(ativoId: string, dataBaixa: string, valorBaixa: number, motivo: string): Promise<BaixaAtivoFixoResultado> {
    const { data, error } = await supabase.rpc('baixar_ativo_fixo', {
      p_ativo_id: ativoId,
      p_data_baixa: dataBaixa,
      p_valor_baixa: valorBaixa,
      p_motivo: motivo,
    });
    if (error) throw translateError(error, 'Erro ao baixar ativo fixo');
    return data as unknown as BaixaAtivoFixoResultado;
  },
};
