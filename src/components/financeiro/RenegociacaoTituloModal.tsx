import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Handshake } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { movimentacoesService } from '@/services/movimentacoesService';
import type { RenegociacaoTitulo, TituloFinanceiro } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';
import { gerarParcelas, somaParcelas } from '@/utils/parcelamento';
import { useAutorizacaoFinanceira } from '@/hooks/useAutorizacaoFinanceira';
import { AutorizacaoFinanceiraModal } from './AutorizacaoFinanceiraModal';

interface RenegociacaoTituloModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  titulo: TituloFinanceiro;
}

export const RenegociacaoTituloModal = ({
  isOpen,
  onClose,
  onSuccess,
  titulo,
}: RenegociacaoTituloModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());

  const saldo = titulo.valor_atual ?? titulo.valor_original;

  const [qtdParcelas, setQtdParcelas] = useState(3);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = crypto.randomUUID();
    setQtdParcelas(3);
    setDataPrimeiraParcela(format(new Date(), 'yyyy-MM-dd'));
    setIntervaloDias(30);
    setMotivo('');
  }, [isOpen, titulo.id]);

  // Determinístico: sempre soma exatamente o saldo (centavos residuais na última parcela).
  // Servidor revalida a soma de qualquer forma — nunca confia só no cálculo do client.
  const parcelas = useMemo(() => {
    if (!isOpen || qtdParcelas < 1 || saldo <= 0) return [];
    try {
      return gerarParcelas({
        valorLiquido: saldo,
        qtdParcelas,
        dataVenda: dataPrimeiraParcela,
        diasPrimeiraParcela: 0,
        intervaloDias,
      });
    } catch {
      return [];
    }
  }, [isOpen, qtdParcelas, dataPrimeiraParcela, intervaloDias, saldo]);

  const somaCalculada = somaParcelas(parcelas);

  const renegociarMutation = useMutation({
    mutationFn: movimentacoesService.renegociarTitulo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.movimentacoesFinanceiras.all });
      queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
      queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
      toast({
        title: 'Título renegociado',
        description: `Saldo substituído por ${parcelas.length} nova(s) parcela(s).`,
      });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      // Falta de autorização não é falha: o diálogo assume e a operação é repetida com ticket.
      if (autorizacao.tratarErro(error)) return;
      toast({
        title: 'Não foi possível renegociar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const autorizacao = useAutorizacaoFinanceira<RenegociacaoTitulo>((vars) =>
    renegociarMutation.mutate(vars),
  );

  const podeSubmeter =
    motivo.trim().length >= 5 &&
    parcelas.length > 0 &&
    !renegociarMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!podeSubmeter) return;
    autorizacao.disparar({
      titulo_id: titulo.id,
      tipo_titulo: titulo.tipo,
      motivo: motivo.trim(),
      idempotency_key: idempotencyKey.current,
      novas_parcelas: parcelas.map((p) => ({
        numero: p.numero,
        valor: p.valor,
        data_vencimento: p.data_vencimento,
      })),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Renegociar título: {titulo.numero_documento}
          </DialogTitle>
          <DialogDescription>
            O saldo em aberto é substituído por novas parcelas. O título original fica marcado
            como renegociado, mantido para auditoria — as parcelas novas ficam rastreadas até ele.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border p-3 text-sm">
            <span className="text-muted-foreground">Saldo em aberto a renegociar: </span>
            <strong>{currencyUtils.formatCurrency(saldo)}</strong>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="qtd-parcelas">Quantidade de parcelas *</Label>
              <Input
                id="qtd-parcelas"
                type="number"
                min={1}
                max={60}
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(Math.max(1, Number(e.target.value) || 1))}
                required
              />
            </div>
            <div>
              <Label htmlFor="data-primeira-parcela">Vencimento da 1ª parcela *</Label>
              <Input
                id="data-primeira-parcela"
                type="date"
                value={dataPrimeiraParcela}
                onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="intervalo-dias">Intervalo entre parcelas (dias) *</Label>
              <Input
                id="intervalo-dias"
                type="number"
                min={1}
                max={365}
                value={intervaloDias}
                onChange={(e) => setIntervaloDias(Math.max(1, Number(e.target.value) || 1))}
                required
              />
            </div>
          </div>

          {parcelas.length > 0 && (
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <div className="flex items-center justify-between border-b pb-2 mb-2 font-medium">
                <span>Novas parcelas</span>
                <span>{currencyUtils.formatCurrency(somaCalculada)}</span>
              </div>
              {parcelas.map((p) => (
                <div key={p.numero} className="flex items-center justify-between text-muted-foreground">
                  <span>
                    {p.numero}/{parcelas.length} — venc. {format(new Date(`${p.data_vencimento}T00:00:00`), 'dd/MM/yyyy')}
                  </span>
                  <span>{currencyUtils.formatCurrency(p.valor)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo-renegociacao">Motivo da renegociação *</Label>
            <Textarea
              id="motivo-renegociacao"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Descreva o motivo (mínimo de 5 caracteres)"
              minLength={5}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button className="h-10 w-full" type="button" variant="outline" onClick={onClose} disabled={renegociarMutation.isPending}>
              Voltar
            </Button>
            <Button className="h-10 w-full" type="submit" disabled={!podeSubmeter}>
              {renegociarMutation.isPending ? 'Renegociando...' : 'Confirmar renegociação'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AutorizacaoFinanceiraModal {...autorizacao.modalProps} />
    </Dialog>
  );
};
