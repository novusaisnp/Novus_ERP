import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FiscalDocumento {
  id: string;
  empresa_representada_id: string;
  venda_id: string | null;
  numero: number | null;
  serie: number | null;
  status: string;
  chave_acesso: string | null;
  protocolo_autorizacao: string | null;
  motivo_rejeicao: string | null;
  codigo_status_sefaz: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  pdf_danfe_url: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  provider: string | null;
  ambiente: string | null;
  tentativas: number;
}

export interface FiscalEvento {
  id: string;
  documento_id: string;
  tipo: string;
  sequencia: number | null;
  justificativa: string | null;
  protocolo: string | null;
  status: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
}

/**
 * Consulta um documento fiscal. Polling automático a cada 15s enquanto
 * o status é 'processando'; Realtime cuida do resto.
 */
export const useFiscalDocumento = (documentoId: string | null | undefined) =>
  useQuery<FiscalDocumento | null>({
    queryKey: ['fiscal-documento', documentoId],
    enabled: !!documentoId,
    refetchInterval: (query) => (query.state.data?.status === 'processando' ? 15_000 : false),
    queryFn: async () => {
      if (!documentoId) return null;
      const { data, error } = await supabase
        .from('fiscal_documentos_eletronicos')
        .select('*')
        .eq('id', documentoId)
        .maybeSingle();
      if (error) throw error;
      return data as FiscalDocumento | null;
    },
  });

export const useFiscalEventos = (documentoId: string | null | undefined) =>
  useQuery<FiscalEvento[]>({
    queryKey: ['fiscal-eventos', documentoId],
    enabled: !!documentoId,
    queryFn: async () => {
      if (!documentoId) return [];
      const { data, error } = await supabase
        .from('fiscal_eventos')
        .select('*')
        .eq('documento_id', documentoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FiscalEvento[];
    },
  });
