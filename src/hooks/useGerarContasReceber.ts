import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { gerarContasReceberDaVenda, type GerarContasReceberResult } from '@/services/contasReceber/gerarDaVenda';

interface Params {
  vendaId: string;
  idempotencyKey?: string;
}

export const useGerarContasReceber = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation<GerarContasReceberResult, Error, Params>({
    mutationFn: ({ vendaId, idempotencyKey }) => gerarContasReceberDaVenda(vendaId, idempotencyKey),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['contas-receber'] });
      qc.invalidateQueries({ queryKey: ['contas-receber-stats'] });
      const parts: string[] = [];
      if (res.gerados > 0) parts.push(`${res.gerados} gerado(s)`);
      if (res.reaproveitados > 0) parts.push(`${res.reaproveitados} reaproveitado(s)`);
      toast({
        title: 'Títulos processados',
        description: parts.length ? parts.join(' • ') : 'Nenhuma parcela elegível.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Falha ao gerar títulos',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
};
