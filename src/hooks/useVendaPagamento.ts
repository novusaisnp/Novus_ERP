// FIN-E3: hook de pagamento da venda + validação
import { useCallback, useEffect, useState } from 'react';
import { vendaPagamentoService } from '@/services/vendaPagamentoService';
import type {
  VendaPagamento,
  VendaPagamentoInput,
  VendaPagamentoParcela,
  ValidacaoPagamentoResult,
} from '@/types/vendaPagamento';
import type { ParcelamentoInput } from '@/utils/parcelamento';
import { useToast } from '@/hooks/use-toast';

export function useVendaPagamento(vendaId?: string) {
  const { toast } = useToast();
  const [pagamentos, setPagamentos] = useState<VendaPagamento[]>([]);
  const [parcelasByPagamento, setParcelasByPagamento] = useState<Record<string, VendaPagamentoParcela[]>>({});
  const [validacao, setValidacao] = useState<ValidacaoPagamentoResult | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!vendaId) return;
    setLoading(true);
    try {
      const lista = await vendaPagamentoService.listByVenda(vendaId);
      setPagamentos(lista);
      const mapa: Record<string, VendaPagamentoParcela[]> = {};
      await Promise.all(
        lista.map(async (p) => { mapa[p.id] = await vendaPagamentoService.listParcelas(p.id); }),
      );
      setParcelasByPagamento(mapa);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [vendaId, toast]);

  useEffect(() => { load(); }, [load]);

  const criarPagamento = useCallback(async (
    input: VendaPagamentoInput,
    parcelamento: Omit<ParcelamentoInput, 'valorLiquido'>,
  ) => {
    try {
      const r = await vendaPagamentoService.criarPagamentoComParcelas(input, { parcelamento });
      await load();
      toast({
        title: r.replay ? 'Pagamento reaproveitado' : 'Pagamento criado',
        description: r.replay ? 'Requisição idempotente detectada.' : `${r.parcelas.length} parcela(s) geradas.`,
      });
      return r;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return null;
    }
  }, [load, toast]);

  const removerPagamento = useCallback(async (id: string) => {
    try {
      await vendaPagamentoService.removerPagamento(id);
      await load();
      return true;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return false;
    }
  }, [load, toast]);

  const validar = useCallback(async () => {
    if (!vendaId) return null;
    try {
      const r = await vendaPagamentoService.validarPagamentoVenda(vendaId);
      setValidacao(r);
      return r;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return null;
    }
  }, [vendaId, toast]);

  return {
    pagamentos,
    parcelasByPagamento,
    validacao,
    loading,
    reload: load,
    criarPagamento,
    removerPagamento,
    validar,
  };
}
