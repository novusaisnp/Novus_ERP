import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export interface Servico {
  id: string;
  nome: string;
  descricao?: string | null;
  preco: number | null;
  ativo: boolean;
  plano_conta_receita_id?: string | null;
  centro_custo_id?: string | null;
  natureza_receita_id?: string | null;
  created_at: string;
}

export interface ClassificacaoOption {
  id: string;
  codigo?: string | null;
  nome: string;
}

export interface ServicoInput {
  nome: string;
  descricao: string | null;
  preco: number | null;
  plano_conta_receita_id: string | null;
  centro_custo_id: string | null;
  natureza_receita_id: string | null;
}

export const servicoService = {
  async listServicos(): Promise<Servico[]> {
    const empresaId = await getEmpresaIdAtual();
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listClassificacoesContabeis(): Promise<{
    planoContas: ClassificacaoOption[];
    centrosCusto: ClassificacaoOption[];
    naturezasReceita: ClassificacaoOption[];
  }> {
    const empresaId = await getEmpresaIdAtual();
    const [pc, cc, nr] = await Promise.all([
      supabase
        .from('plano_contas')
        .select('id, codigo, nome, tipo, aceita_lancamento, ativo')
        .eq('empresa_representada_id', empresaId)
        .eq('tipo', 'RECEITA')
        .eq('aceita_lancamento', true)
        .eq('ativo', true)
        .order('codigo', { ascending: true }),
      supabase
        .from('centros_custo')
        .select('id, codigo, nome, ativo')
        .eq('empresa_representada_id', empresaId)
        .eq('ativo', true)
        .order('codigo', { ascending: true }),
      supabase
        .from('naturezas_receita')
        .select('id, codigo, nome, ativo')
        .eq('empresa_representada_id', empresaId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .order('codigo', { ascending: true }),
    ]);
    if (pc.error) throw pc.error;
    if (cc.error) throw cc.error;
    if (nr.error) throw nr.error;
    return {
      planoContas: pc.data ?? [],
      centrosCusto: cc.data ?? [],
      naturezasReceita: nr.data ?? [],
    };
  },

  async criarServico(input: ServicoInput): Promise<void> {
    const empresaId = await getEmpresaIdAtual();
    const { error } = await supabase.from('servicos').insert([{ ...input, empresa_representada_id: empresaId }]);
    if (error) throw error;
  },

  async atualizarServico(id: string, input: ServicoInput): Promise<void> {
    const empresaId = await getEmpresaIdAtual();
    const { error } = await supabase.from('servicos').update(input).eq('id', id).eq('empresa_representada_id', empresaId);
    if (error) throw error;
  },

  async excluirServico(id: string): Promise<void> {
    const empresaId = await getEmpresaIdAtual();
    const { error } = await supabase.from('servicos').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('empresa_representada_id', empresaId);
    if (error) throw error;
  },
};
