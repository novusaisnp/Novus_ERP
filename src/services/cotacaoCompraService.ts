import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';
import type { CotacaoCompra, CotacaoCompraInput, RegistrarPrecoInput } from '@/types/cotacaoCompra';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Esta cotação já foi fechada/cancelada, ou você não tem permissão para esta operação.');
  }
  if (code === '23505') {
    return new Error('Este fornecedor já foi convidado, ou já existe um preço registrado para ele neste item.');
  }
  if (code === '23503') {
    return new Error('Um dos registros referenciados não foi encontrado — atualize a página e tente de novo.');
  }
  if (code === '23514') {
    return new Error('Valor inválido — preço precisa ser maior que zero.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const cotacaoCompraService = {
  async list(): Promise<CotacaoCompra[]> {
    const { data, error } = await supabase
      .from('cotacoes_compra')
      .select('*, fornecedores:cotacoes_compra_fornecedores(*), precos:cotacoes_compra_precos(*)')
      .order('created_at', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar cotações');
    return (data || []) as unknown as CotacaoCompra[];
  },

  async get(id: string): Promise<CotacaoCompra | null> {
    const { data, error } = await supabase
      .from('cotacoes_compra')
      .select('*, fornecedores:cotacoes_compra_fornecedores(*), precos:cotacoes_compra_precos(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw translateError(error, 'Erro ao buscar cotação');
    return data as unknown as CotacaoCompra | null;
  },

  async create(input: CotacaoCompraInput): Promise<CotacaoCompra> {
    if (input.fornecedor_ids.length === 0) {
      throw new Error('Convide pelo menos um fornecedor.');
    }
    const empresa_representada_id = await getEmpresaId();
    const { data: userData } = await supabase.auth.getUser();
    const criado_por = userData.user?.id;
    if (!criado_por) throw new Error('Sessão expirada — faça login novamente.');

    const { data: cotacao, error: cotError } = await supabase
      .from('cotacoes_compra')
      .insert([{
        empresa_representada_id,
        requisicao_id: input.requisicao_id,
        criado_por,
        prazo_resposta: input.prazo_resposta || null,
        observacoes: input.observacoes?.trim() || null,
      }])
      .select()
      .single();
    if (cotError) throw translateError(cotError, 'Erro ao criar cotação');

    const fornecedoresRows = input.fornecedor_ids.map((fornecedor_id) => ({
      cotacao_id: cotacao.id,
      empresa_representada_id,
      fornecedor_id,
    }));
    const { error: fornError } = await supabase.from('cotacoes_compra_fornecedores').insert(fornecedoresRows);
    if (fornError) throw translateError(fornError, 'Erro ao convidar fornecedores');

    return { ...cotacao, fornecedores: fornecedoresRows, precos: [] } as unknown as CotacaoCompra;
  },

  async convidarFornecedor(cotacaoId: string, fornecedorId: string): Promise<void> {
    const empresa_representada_id = await getEmpresaId();
    const { error } = await supabase
      .from('cotacoes_compra_fornecedores')
      .insert([{ cotacao_id: cotacaoId, empresa_representada_id, fornecedor_id: fornecedorId }]);
    if (error) throw translateError(error, 'Erro ao convidar fornecedor');
  },

  async removerFornecedor(convidadoId: string): Promise<void> {
    const { error } = await supabase.from('cotacoes_compra_fornecedores').delete().eq('id', convidadoId);
    if (error) throw translateError(error, 'Erro ao remover fornecedor');
  },

  async registrarPreco(input: RegistrarPrecoInput): Promise<void> {
    const empresa_representada_id = await getEmpresaId();
    const { error } = await supabase
      .from('cotacoes_compra_precos')
      .upsert([{
        cotacao_id: input.cotacao_id,
        empresa_representada_id,
        requisicao_item_id: input.requisicao_item_id,
        fornecedor_id: input.fornecedor_id,
        preco_unitario: input.preco_unitario,
        prazo_entrega_dias: input.prazo_entrega_dias ?? null,
        observacao: input.observacao?.trim() || null,
      }], { onConflict: 'cotacao_id,requisicao_item_id,fornecedor_id' });
    if (error) throw translateError(error, 'Erro ao registrar preço');
  },

  async marcarVencedor(precoId: string, requisicaoItemId: string, cotacaoId: string): Promise<void> {
    // Desmarca o vencedor anterior do mesmo item (se houver) antes de marcar o
    // novo — o índice único parcial (1 vencedor por item) rejeitaria os dois
    // marcados ao mesmo tempo.
    const { error: unmarkError } = await supabase
      .from('cotacoes_compra_precos')
      .update({ vencedor: false })
      .eq('cotacao_id', cotacaoId)
      .eq('requisicao_item_id', requisicaoItemId)
      .eq('vencedor', true);
    if (unmarkError) throw translateError(unmarkError, 'Erro ao trocar vencedor');

    const { error } = await supabase.from('cotacoes_compra_precos').update({ vencedor: true }).eq('id', precoId);
    if (error) throw translateError(error, 'Erro ao marcar vencedor');
  },

  async fechar(id: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error, data } = await supabase
      .from('cotacoes_compra')
      .update({ status: 'FECHADA', fechada_em: new Date().toISOString(), fechada_por: userData.user?.id })
      .eq('id', id)
      .select('id');
    if (error) throw translateError(error, 'Erro ao fechar cotação');
    if (!data || data.length === 0) {
      throw new Error('Não foi possível fechar — a cotação pode já estar fechada ou cancelada.');
    }
  },

  async cancelar(id: string): Promise<void> {
    const { error, data } = await supabase
      .from('cotacoes_compra')
      .update({ status: 'CANCELADA' })
      .eq('id', id)
      .select('id');
    if (error) throw translateError(error, 'Erro ao cancelar cotação');
    if (!data || data.length === 0) {
      throw new Error('Não foi possível cancelar — a cotação pode já estar fechada ou cancelada.');
    }
  },
};
