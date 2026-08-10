import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getEmpresaAtivaId } from '@/lib/empresaAtiva';

export interface IntegracaoPonto {
  id: string;
  nome: string;
  tipo: string | null;
  endpoint: string | null;
  token_autenticacao: string | null;
  configuracoes: Json;
  ativo: boolean | null;
  ultima_sincronizacao: string | null;
}

export interface IntegracaoPontoInput {
  nome: string;
  tipo: string | null;
  endpoint: string | null;
  token_autenticacao: string | null;
  configuracoes: Json;
  ativo: boolean;
}

export const integracaoPontoService = {
  async listIntegracoes(): Promise<IntegracaoPonto[]> {
    const { data, error } = await supabase.from('integracoes_ponto').select('*').order('nome');
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

  async atualizarIntegracao(id: string, input: IntegracaoPontoInput): Promise<void> {
    const { error } = await supabase.from('integracoes_ponto').update(input).eq('id', id);
    if (error) throw error;
  },
};
