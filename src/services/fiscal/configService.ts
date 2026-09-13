import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { ConfiguracaoFiscal } from '@/types/fiscal';

type ConfigInsert = Database['public']['Tables']['fiscal_configuracoes']['Insert'];
type ConfigMDFeWrite = { serie_mdfe?: number | null; proximo_numero_mdfe?: number | null; rntrc?: string | null };
type ConfigContingenciaWrite = { serie_nfce_contingencia?: number | null };

type ConfigRow = {
  id: string;
  empresa_representada_id: string;
  ambiente: string;
  provedor: string;
  regime_tributario: string;
  cnpj_emitente: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  serie_nfe: number | null;
  proximo_numero_nfe: number | null;
  serie_nfce: number | null;
  proximo_numero_nfce: number | null;
  serie_nfce_contingencia?: number | null;
  serie_mdfe?: number | null;
  proximo_numero_mdfe?: number | null;
  rntrc?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

const fromRow = (item: ConfigRow): ConfiguracaoFiscal => ({
  id: item.id,
  empresaRepresentadaId: item.empresa_representada_id,
  ambiente: item.ambiente as ConfiguracaoFiscal['ambiente'],
  provedor: item.provedor as ConfiguracaoFiscal['provedor'],
  regimeTributario: item.regime_tributario as ConfiguracaoFiscal['regimeTributario'],
  cnpjEmitente: item.cnpj_emitente || '',
  inscricaoEstadual: item.inscricao_estadual || '',
  inscricaoMunicipal: item.inscricao_municipal || undefined,
  serieNfe: item.serie_nfe || 1,
  proximoNumeroNfe: item.proximo_numero_nfe || undefined,
  serieNfce: item.serie_nfce || undefined,
  proximoNumeroNfce: item.proximo_numero_nfce || undefined,
  serieNfceContingencia: item.serie_nfce_contingencia || undefined,
  serieMdfe: item.serie_mdfe || undefined,
  proximoNumeroMdfe: item.proximo_numero_mdfe || undefined,
  rntrc: item.rntrc || undefined,
  ativo: item.ativo,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

export const fetchConfiguracoesFiscais = async (): Promise<ConfiguracaoFiscal[]> => {
  const { data, error } = await supabase
    .from('fiscal_configuracoes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as ConfigRow[]).map(fromRow);
};

export const createConfiguracaoFiscal = async (config: ConfiguracaoFiscal): Promise<ConfiguracaoFiscal> => {
  const payload: ConfigInsert & ConfigMDFeWrite & ConfigContingenciaWrite = {
    empresa_representada_id: config.empresaRepresentadaId,
    ambiente: config.ambiente,
    provedor: config.provedor,
    regime_tributario: config.regimeTributario,
    cnpj_emitente: config.cnpjEmitente.replace(/\D/g, ''),
    inscricao_estadual: config.inscricaoEstadual,
    inscricao_municipal: config.inscricaoMunicipal || null,
    serie_nfe: config.serieNfe,
    proximo_numero_nfe: config.proximoNumeroNfe || null,
    serie_nfce: config.serieNfce || null,
    proximo_numero_nfce: config.proximoNumeroNfce || null,
    serie_nfce_contingencia: config.serieNfceContingencia || null,
    serie_mdfe: config.serieMdfe || null,
    proximo_numero_mdfe: config.proximoNumeroMdfe || null,
    rntrc: config.rntrc || null,
    ativo: config.ativo,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('fiscal_configuracoes')
    .upsert(payload as ConfigInsert, { onConflict: 'empresa_representada_id' })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as ConfigRow);
};
