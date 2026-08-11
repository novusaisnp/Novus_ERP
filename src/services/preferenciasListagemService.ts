import { supabase } from '@/integrations/supabase/client';

const TABLE = 'preferencias_listagem';

export const preferenciasListagemService = {
  async obter(usuarioId: string, empresaId: string, tela: 'entidades'): Promise<string[] | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('colunas_visiveis')
      .eq('usuario_id', usuarioId)
      .eq('empresa_representada_id', empresaId)
      .eq('tela', tela)
      .maybeSingle();
    if (error) throw error;
    return data ? data.colunas_visiveis as string[] : null;
  },

  async salvar(usuarioId: string, empresaId: string, tela: 'entidades', colunas: string[]): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .upsert({
        usuario_id: usuarioId,
        empresa_representada_id: empresaId,
        tela,
        colunas_visiveis: colunas,
      }, { onConflict: 'usuario_id,empresa_representada_id,tela' });
    if (error) throw error;
  },
};
