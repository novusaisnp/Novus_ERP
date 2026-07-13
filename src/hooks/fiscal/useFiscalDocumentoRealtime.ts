import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina Realtime para um documento fiscal específico. Invalida as queries
 * relevantes quando o documento muda ou um novo evento é inserido.
 * Deve ser chamado dentro do componente que exibe o detalhe — o cleanup
 * remove o canal quando o componente desmonta.
 */
export const useFiscalDocumentoRealtime = (documentoId: string | null | undefined) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!documentoId) return;

    const channel = supabase
      .channel(`fiscal-doc-${documentoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fiscal_documentos_eletronicos',
          filter: `id=eq.${documentoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['fiscal-documento', documentoId] });
          qc.invalidateQueries({ queryKey: ['fiscal-status-por-venda'] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fiscal_eventos',
          filter: `documento_id=eq.${documentoId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['fiscal-eventos', documentoId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentoId, qc]);
};
