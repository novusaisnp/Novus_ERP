// FIN-E2: hook de política de pagamento/crédito por cliente
import { useEffect, useState, useCallback } from 'react';
import { clientePoliticaService } from '@/services/clientePoliticaService';
import type {
  ClientePoliticaPagamento,
  ClientePoliticaInput,
  ClienteModalidadeBloqueada,
} from '@/types/clientePolitica';
import { useToast } from '@/hooks/use-toast';

export function useClientePolitica(clienteId?: string) {
  const { toast } = useToast();
  const [politica, setPolitica] = useState<ClientePoliticaPagamento | null>(null);
  const [modalidadesBloqueadas, setModalidadesBloqueadas] = useState<ClienteModalidadeBloqueada[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const [p, mb] = await Promise.all([
        clientePoliticaService.getByCliente(clienteId),
        clientePoliticaService.listModalidadesBloqueadas(clienteId),
      ]);
      setPolitica(p);
      setModalidadesBloqueadas(mb);
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [clienteId, toast]);

  useEffect(() => { load(); }, [load]);

  const salvar = useCallback(async (payload: ClientePoliticaInput) => {
    setSaving(true);
    try {
      const saved = await clientePoliticaService.upsert(payload);
      setPolitica(saved);
      toast({ title: 'Política salva', description: 'Política de pagamento atualizada.' });
      return true;
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const bloquearModalidade = useCallback(async (params: {
    empresa_representada_id: string;
    modalidade_id: string;
    motivo?: string | null;
  }) => {
    if (!clienteId) return false;
    try {
      await clientePoliticaService.addModalidadeBloqueada({
        empresa_representada_id: params.empresa_representada_id,
        cliente_id: clienteId,
        modalidade_id: params.modalidade_id,
        motivo: params.motivo ?? null,
      });
      await load();
      return true;
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      return false;
    }
  }, [clienteId, load, toast]);

  const desbloquearModalidade = useCallback(async (modalidadeId: string) => {
    if (!clienteId) return false;
    try {
      await clientePoliticaService.removeModalidadeBloqueada(clienteId, modalidadeId);
      await load();
      return true;
    } catch (e) {
      toast({ title: 'Erro', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      return false;
    }
  }, [clienteId, load, toast]);

  return {
    politica,
    modalidadesBloqueadas,
    loading,
    saving,
    reload: load,
    salvar,
    bloquearModalidade,
    desbloquearModalidade,
  };
}
