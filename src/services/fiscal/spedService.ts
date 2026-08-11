import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

export interface SpedArquivo {
  id: string;
  tipo: string;
  periodo_ini: string;
  periodo_fim: string;
  status: string;
  arquivo_url: string | null;
  erro_mensagem: string | null;
  linhas_geradas: number | null;
  created_at: string;
}

export const spedService = {
  async listar(): Promise<SpedArquivo[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('fiscal_sped_arquivos')
      .select('id,tipo,periodo_ini,periodo_fim,status,arquivo_url,erro_mensagem,linhas_geradas,created_at')
      .eq('empresa_representada_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async urlDownload(path: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('fiscal-signed-url', {
      body: { bucket: 'fiscal-sped', path },
    });
    if (error || !data?.url) throw error || new Error('Arquivo SPED indisponível.');
    return data.url;
  },
};
