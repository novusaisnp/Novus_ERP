import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { qk } from '@/lib/queryKeys';
import { movimentacoesService, type RateioTitulo } from '@/services/movimentacoesService';
import type { RateioContaPagar } from '@/types/contasPagar';
import type { TituloFinanceiro } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';
import { RateioManager } from '@/components/financeiro/contas-pagar/RateioManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  titulo: TituloFinanceiro;
  rateios: RateioTitulo[];
}

/**
 * Edição do rateio contábil direto no detalhe do título.
 *
 * Reusa o `RateioManager` do formulário de contas a pagar, que já traz seleção de rubrica e
 * centro de custo, distribuição igualitária e conferência da soma — em vez de um segundo
 * editor com as mesmas regras escritas de outro jeito.
 */
export const RateioContabilModal = ({ isOpen, onClose, titulo, rateios }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rascunho, setRascunho] = useState<RateioContaPagar[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setRascunho(
      rateios.map((r) => ({
        plano_conta_id: r.plano_conta?.id ?? '',
        centro_custo_id: r.centro_custo?.id ?? undefined,
        valor: Number(r.valor) || 0,
        percentual: titulo.valor_original
          ? Number((((Number(r.valor) || 0) / titulo.valor_original) * 100).toFixed(2))
          : 0,
        descricao: r.descricao ?? undefined,
        plano_conta: r.plano_conta ?? undefined,
        centro_custo: r.centro_custo ?? undefined,
      })) as RateioContaPagar[],
    );
  }, [isOpen, rateios, titulo.valor_original]);

  const soma = rascunho.reduce((total, r) => total + (r.valor || 0), 0);
  // Rateio vazio é válido: significa remover o rateio do título.
  const fecha = rascunho.length === 0 || Math.abs(soma - titulo.valor_original) < 0.01;
  const temRubrica = rascunho.every((r) => Boolean(r.plano_conta_id));

  const salvar = useMutation({
    mutationFn: () =>
      movimentacoesService.salvarRateios(titulo.id, titulo.tipo, rascunho),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rateios-titulo', titulo.id] });
      queryClient.invalidateQueries({ queryKey: qk.movimentacoesFinanceiras.all });
      queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
      queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
      toast({ title: 'Rateio contábil atualizado' });
      onClose();
    },
    onError: (erro: Error) => {
      toast({
        title: 'Não foi possível salvar o rateio',
        description: erro.message,
        variant: 'destructive',
      });
    },
  });

  // O editor só entrega uma linha depois de "Pré-registrar rateio"; até lá ela chega aqui
  // vazia. Sem dizer isso, o botão de salvar fica desabilitado sem explicação.
  const impedimento = !temRubrica
    ? 'Escolha a rubrica e clique em "Pré-registrar rateio" para confirmar cada linha.'
    : !fecha
      ? `A soma dos rateios (${currencyUtils.formatCurrency(soma)}) precisa ser igual ao valor do título (${currencyUtils.formatCurrency(titulo.valor_original)}).`
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Rateio contábil do título
          </DialogTitle>
          <DialogDescription>
            Divide {currencyUtils.formatCurrency(titulo.valor_original)} entre rubricas do plano
            de contas. Deixe a lista vazia para remover o rateio.
          </DialogDescription>
        </DialogHeader>

        <RateioManager
          valorTotal={titulo.valor_original}
          rateios={rascunho}
          onRateiosChange={setRascunho}
          tipo={titulo.tipo === 'CONTAS_RECEBER' ? 'RECEITA' : 'DESPESA'}
        />

        {impedimento && (
          <p className="text-sm text-destructive">{impedimento}</p>
        )}

        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={onClose} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => salvar.mutate()}
            disabled={Boolean(impedimento) || salvar.isPending}
          >
            {salvar.isPending ? 'Salvando...' : 'Salvar rateio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
