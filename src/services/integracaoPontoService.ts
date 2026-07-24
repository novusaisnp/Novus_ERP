import { supabase } from '@/integrations/supabase/client';

export interface IntegracaoPonto {
  id: string;
  nome: string;
  tipo: string | null;
  endpoint: string | null;
  token_autenticacao: string | null;
  configuracoes: unknown;
  ativo: boolean | null;
  ultima_sincronizacao: string | null;
}

export interface IntegracaoPontoInput {
  nome: string;
  tipo: string | null;
  endpoint: string | null;
  token_autenticacao: string | null;
  configuracoes: unknown;
  ativo: boolean;
}

export const integracaoPontoService = {
  async listIntegracoes(): Promise<IntegracaoPonto[]> {
    const { data, error } = await supabase.from('integracoes_ponto').select('*').order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async criarIntegracao(input: IntegracaoPontoInput): Promise<void> {
    const { data: empresaId, error: empresaError } = await supabase.rpc('get_user_empresa_id');
    if (empresaError) throw empresaError;
    if (!empresaId) throw new Error('Empresa não encontrada');

    const { error } = await supabase
      .from('integracoes_ponto')
      .insert({ ...input, empresa_representada_id: empresaId });
    if (error) throw error;
  },

  async atualizarIntegracao(id: string, input: IntegracaoPontoInput): Promise<void> {
    const { error } = await supabase.from('integracoes_ponto').update(input).eq('id', id);
    if (error) throw error;
  },
};
