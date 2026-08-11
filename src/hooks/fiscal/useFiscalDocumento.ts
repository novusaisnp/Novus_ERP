import { useQuery } from "@tanstack/react-query";
import {
  getFiscalDocumento,
  getFiscalEventos,
  type FiscalDocumento,
  type FiscalEvento,
} from "@/services/fiscal/emissaoService";

export type { FiscalDocumento, FiscalEvento };

/**
 * Consulta um documento fiscal. Polling automático a cada 15s enquanto
 * o status é 'processando'; Realtime cuida do resto.
 */
export const useFiscalDocumento = (documentoId: string | null | undefined) =>
  useQuery<FiscalDocumento | null>({
    queryKey: ['fiscal-documento', documentoId],
    enabled: !!documentoId,
    refetchInterval: (query) => (
      ['processando', 'em_processamento'].includes(query.state.data?.status?.toLowerCase() ?? '') ? 15_000 : false
    ),
    queryFn: async () => {
      if (!documentoId) return null;
      return getFiscalDocumento(documentoId);
    },
  });

export const useFiscalEventos = (documentoId: string | null | undefined) =>
  useQuery<FiscalEvento[]>({
    queryKey: ['fiscal-eventos', documentoId],
    enabled: !!documentoId,
    queryFn: async () => {
      if (!documentoId) return [];
      return getFiscalEventos(documentoId);
    },
  });
