import { useEffect, useRef, useState } from 'react';
import { Ban } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { movimentacoesService } from '@/services/movimentacoesService';
import type { CancelamentoTitulo, TituloFinanceiro } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';
import { useAutorizacaoFinanceira } from '@/hooks/useAutorizacaoFinanceira';
import { AutorizacaoFinanceiraModal } from './AutorizacaoFinanceiraModal';

interface CancelamentoTituloModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  titulo: TituloFinanceiro;
}

export const CancelamentoTituloModal = ({
  isOpen,
  onClose,
  onSuccess,
  titulo,
}: CancelamentoTituloModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = crypto.randomUUID();
    setMotivo('');
  }, [isOpen, titulo.id]);

  const cancelarMutation = useMutation({
    mutationFn: movimentacoesService.cancelarTitulo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.movimentacoesFinanceiras.all });
      queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
      queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
      toast({ title: 'Título cancelado', description: 'O cancelamento foi registrado no histórico.' });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      // Falta de autorização não é falha: o diálogo assume e a operação é repetida com ticket.
      if (autorizacao.tratarErro(error)) return;
      toast({
        title: 'Não foi possível cancelar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const autorizacao = useAutorizacaoFinanceira<CancelamentoTitulo>((vars) =>
    cancelarMutation.mutate(vars),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (motivo.trim().length < 5 || cancelarMutation.isPending) return;
    autorizacao.disparar({
      titulo_id: titulo.id,
      tipo_titulo: titulo.tipo,
      motivo_cancelamento: motivo.trim(),
      idempotency_key: idempotencyKey.current,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Cancelar título: {titulo.numero_documento}
          </DialogTitle>
          <DialogDescription>
            O título será mantido para auditoria com status cancelado. Esta ação exige motivo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-md border p-3 text-sm">
            <span className="text-muted-foreground">Valor original: </span>
            <strong>{currencyUtils.formatCurrency(titulo.valor_original)}</strong>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo-cancelamento">Motivo do cancelamento *</Label>
            <Textarea
              id="motivo-cancelamento"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Descreva o motivo (mínimo de 5 caracteres)"
              minLength={5}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button className="h-10 w-full" type="button" variant="outline" onClick={onClose} disabled={cancelarMutation.isPending}>
              Voltar
            </Button>
            <Button
              className="h-10 w-full"
              type="submit"
              variant="destructive"
              disabled={motivo.trim().length < 5 || cancelarMutation.isPending}
            >
              {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AutorizacaoFinanceiraModal {...autorizacao.modalProps} />
    </Dialog>
  );
};
