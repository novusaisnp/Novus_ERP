import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';
import type { RequisicaoCompra, RequisicaoCompraInput } from '@/types/requisicaoCompra';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para esta operação.');
  }
  if (code === '23503') {
    return new Error('Um dos produtos selecionados não foi encontrado — atualize a página e tente de novo.');
  }
  if (code === '23514') {
    return new Error('Quantidade inválida — precisa ser maior que zero.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const requisicaoCompraService = {
  async list(): Promise<RequisicaoCompra[]> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('requisicoes_compra')
      .select('*, itens:requisicoes_compra_itens(*)')
      .eq('empresa_representada_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar requisições de compra');
    return (data || []) as unknown as RequisicaoCompra[];
  },

  async create(input: RequisicaoCompraInput): Promise<RequisicaoCompra> {
    if (input.itens.length === 0) {
      throw new Error('Adicione pelo menos um item à requisição.');
    }
    const empresa_representada_id = await getEmpresaId();
    const { data: userData } = await supabase.auth.getUser();
    const solicitante_id = userData.user?.id;
    if (!solicitante_id) throw new Error('Sessão expirada — faça login novamente.');

    const { data: requisicao, error: reqError } = await supabase
      .from('requisicoes_compra')
      .insert([{
        empresa_representada_id,
        solicitante_id,
        centro_custo_id: input.centro_custo_id || null,
        justificativa: input.justificativa.trim(),
        data_necessidade: input.data_necessidade || null,
      }])
      .select()
      .single();
    if (reqError) throw translateError(reqError, 'Erro ao criar requisição de compra');

    const itensRows = input.itens.map((item) => ({
      requisicao_id: requisicao.id,
      empresa_representada_id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      observacao: item.observacao?.trim() || null,
    }));
    const { error: itensError } = await supabase.from('requisicoes_compra_itens').insert(itensRows);
    if (itensError) throw translateError(itensError, 'Erro ao salvar itens da requisição');

    return { ...requisicao, itens: itensRows } as unknown as RequisicaoCompra;
  },

  async cancelar(id: string): Promise<void> {
    const empresaId = await getEmpresaId();
    const { error, data } = await supabase
      .from('requisicoes_compra')
      .update({ status: 'CANCELADA' })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select('id');
    if (error) throw translateError(error, 'Erro ao cancelar requisição');
    if (!data || data.length === 0) {
      throw new Error('Não foi possível cancelar — só o solicitante (ou um admin) pode cancelar uma requisição aberta.');
    }
  },
};
