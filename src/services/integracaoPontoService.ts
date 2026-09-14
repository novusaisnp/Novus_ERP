import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

// AUDITORIA_NOVA Fase 6: token_autenticacao nunca é lido de volta pro cliente —
// nem na listagem (select explícito, sem essa coluna) nem na edição (o campo do
// formulário começa vazio; só grava se o usuário digitar algo novo). Antes,
// `select('*')` devolvia o token em texto puro em toda carga da tela, e o
// formulário de edição o reexibia pronto pra copiar.
export interface IntegracaoPonto {
  id: string;
  nome: string;
  tipo: string | null;
  endpoint: string | null;
  configuracoes: Json;
  ativo: boolean | null;
  ultima_sincronizacao: string | null;
}

export interface IntegracaoPontoInput {
  nome: string;
  tipo: string | null;
  endpoint: string | null;
  token_autenticacao?: string | null;
  configuracoes: Json;
  ativo: boolean;
}

const LIST_COLUMNS = 'id, nome, tipo, endpoint, configuracoes, ativo, ultima_sincronizacao';

export const integracaoPontoService = {
  async listIntegracoes(): Promise<IntegracaoPonto[]> {
    const empresaId = await getEmpresaAtivaId();
    const { data, error } = await supabase
      .from('integracoes_ponto')
      .select(LIST_COLUMNS)
      .eq('empresa_representada_id', empresaId)
      .order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async criarIntegracao(input: IntegracaoPontoInput): Promise<void> {
    const empresaId = await getEmpresaAtivaId();
    if (!empresaId) throw new Error('Empresa não encontrada');

    const { error } = await supabase
      .from('integracoes_ponto')
      .insert({ ...input, empresa_representada_id: empresaId });
    if (error) throw error;
  },

  // input.token_autenticacao ausente = mantém o token já gravado; só troca se
  // o campo vier preenchido (nunca vem preenchido a partir de dado lido de volta).
  async atualizarIntegracao(id: string, input: IntegracaoPontoInput): Promise<void> {
    const empresaId = await getEmpresaAtivaId();
    const { token_autenticacao, ...rest } = input;
    const payload: IntegracaoPontoInput = token_autenticacao ? input : rest;
    const { error } = await supabase
      .from('integracoes_ponto')
      .update(payload)
      .eq('id', id)
      .eq('empresa_representada_id', empresaId);
    if (error) throw error;
  },
};
