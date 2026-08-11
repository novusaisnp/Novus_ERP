import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { movimentacoesService } from '@/services/movimentacoesService';
import type { TituloFinanceiro } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

interface EstornoLiquidacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  titulo: TituloFinanceiro;
}

export const EstornoLiquidacaoModal = ({
  isOpen,
  onClose,
  onSuccess,
  titulo,
}: EstornoLiquidacaoModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [liquidacaoId, setLiquidacaoId] = useState('');
  const [motivo, setMotivo] = useState('');

  const { data: liquidacoes = [], error, isLoading } = useQuery({
    queryKey: ['liquidacoes-titulo', titulo.id, titulo.tipo],
    queryFn: () => movimentacoesService.getLiquidacoesTitulo(titulo.id, titulo.tipo),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = crypto.randomUUID();
    setLiquidacaoId('');
    setMotivo('');
  }, [isOpen, titulo.id]);

  useEffect(() => {
    if (isOpen && !liquidacaoId && liquidacoes.length === 1) {
      setLiquidacaoId(liquidacoes[0].id);
    }
  }, [isOpen, liquidacaoId, liquidacoes]);

  const estornarMutation = useMutation({
    mutationFn: movimentacoesService.estornarLiquidacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.movimentacoesFinanceiras.all });
      queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
      queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
      queryClient.invalidateQueries({ queryKey: qk.movimentacoesBancarias.all });
      queryClient.invalidateQueries({ queryKey: qk.contasBancarias.all });
      toast({ title: 'Estorno concluído', description: 'A baixa escolhida foi estornada.' });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível estornar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!liquidacaoId || motivo.trim().length < 5 || estornarMutation.isPending) return;
    estornarMutation.mutate({
      liquidacao_id: liquidacaoId,
      motivo: motivo.trim(),
      idempotency_key: idempotencyKey.current,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Estornar baixa: {titulo.numero_documento}
          </DialogTitle>
          <DialogDescription>
            Selecione a baixa que será revertida. As demais liquidações do título serão preservadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Baixa a estornar</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando baixas...</p>
            ) : error ? (
              <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                {error instanceof Error ? error.message : 'Erro ao carregar as baixas.'}
              </p>
            ) : liquidacoes.length === 0 ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">
                Nenhuma baixa ativa foi encontrada para este título.
              </p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto">
                {liquidacoes.map((liquidacao) => (
                  <label
                    key={liquidacao.id}
                    className="flex cursor-pointer gap-3 rounded-md border p-3 hover:bg-muted/50"
                  >
                    <input
                      type="radio"
                      name="liquidacao"
                      value={liquidacao.id}
                      checked={liquidacaoId === liquidacao.id}
                      onChange={() => {
                        setLiquidacaoId(liquidacao.id);
                        idempotencyKey.current = crypto.randomUUID();
                      }}
                      className="mt-1"
                    />
                    <span className="min-w-0 text-sm">
                      <strong>{currencyUtils.formatCurrency(liquidacao.valor_pago)}</strong>
                      {' · '}{new Date(liquidacao.data_pagamento).toLocaleDateString('pt-BR')}
                      {' · '}{liquidacao.forma_pagamento || 'Forma não informada'}
                      {liquidacao.conta_bancaria && (
                        <span className="block text-muted-foreground">
                          Conta {liquidacao.conta_bancaria.numero_conta}
                          {liquidacao.conta_bancaria.nome_titular
                            ? ` — ${liquidacao.conta_bancaria.nome_titular}`
                            : ''}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo-estorno">Motivo do estorno *</Label>
            <Textarea
              id="motivo-estorno"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Descreva o motivo (mínimo de 5 caracteres)"
              rows={3}
              required
              minLength={5}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button className="h-10 w-full" type="button" variant="outline" onClick={onClose} disabled={estornarMutation.isPending}>
              Cancelar
            </Button>
            <Button
              className="h-10 w-full"
              type="submit"
              variant="destructive"
              disabled={!liquidacaoId || motivo.trim().length < 5 || estornarMutation.isPending}
            >
              {estornarMutation.isPending ? 'Estornando...' : 'Confirmar estorno'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
