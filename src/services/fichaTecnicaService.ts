import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';
import type { FichaTecnica, FichaTecnicaComItens, FichaTecnicaInput } from '@/types/producao';

function translateError(error: { code?: string; message?: string } | null, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para esta operação.');
  }
  if (code === '23505') {
    return new Error('Este produto já tem uma ficha técnica ativa — desative a atual antes de criar outra.');
  }
  if (code === '23503') {
    return new Error('Um dos produtos selecionados não foi encontrado — atualize a página e tente de novo.');
  }
  if (code === '23514') {
    return new Error('Quantidade inválida — precisa ser maior que zero.');
  }
  if (/insumo de sua própria ficha/.test(msg)) {
    return new Error('Um produto não pode ser insumo de sua própria ficha técnica.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const fichaTecnicaService = {
  async list(): Promise<FichaTecnicaComItens[]> {
    const { data, error } = await supabase
      .from('fichas_tecnicas')
      .select('*, itens:fichas_tecnicas_itens(*)')
      .order('created_at', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar fichas técnicas');
    return (data || []) as unknown as FichaTecnicaComItens[];
  },

  async create(input: FichaTecnicaInput): Promise<FichaTecnica> {
    if (input.itens.length === 0) {
      throw new Error('Adicione pelo menos um insumo à ficha técnica.');
    }
    const empresa_representada_id = await getEmpresaId();
    const { data: ficha, error: fichaError } = await supabase
      .from('fichas_tecnicas')
      .insert([{
        empresa_representada_id,
        produto_id: input.produto_id,
        nome: input.nome.trim(),
        observacoes: input.observacoes?.trim() || null,
      }])
      .select()
      .single();
    if (fichaError) throw translateError(fichaError, 'Erro ao criar ficha técnica');

    const itensRows = input.itens.map((item) => ({
      empresa_representada_id,
      ficha_tecnica_id: ficha.id,
      produto_insumo_id: item.produto_insumo_id,
      quantidade: item.quantidade,
    }));
    const { error: itensError } = await supabase.from('fichas_tecnicas_itens').insert(itensRows);
    if (itensError) {
      // Desativa a ficha órfã (sem itens) em vez de deixá-la bloqueando o índice único de
      // "1 ficha ativa por produto" — não há policy de DELETE para o cabeçalho (mesma
      // convenção de ativos_fixos: baixa/desativação, nunca apagar a linha).
      await supabase.from('fichas_tecnicas').update({ ativo: false }).eq('id', ficha.id);
      throw translateError(itensError, 'Erro ao salvar itens da ficha técnica');
    }

    return ficha as FichaTecnica;
  },

  async desativar(id: string): Promise<void> {
    const { error } = await supabase.from('fichas_tecnicas').update({ ativo: false }).eq('id', id);
    if (error) throw translateError(error, 'Erro ao desativar ficha técnica');
  },
};
