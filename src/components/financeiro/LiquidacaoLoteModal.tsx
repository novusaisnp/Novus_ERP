import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, CheckCircle2, XCircle, ShieldAlert, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';

import { listarContasBancariasAtivasComAgenciaBanco } from '@/services/contaBancariaService';
import { movimentacoesService } from '@/services/movimentacoesService';
import { AutorizacaoRequeridaError } from '@/services/autorizacaoFinanceiraService';
import { TituloFinanceiro, FormaPagamento } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

interface LiquidacaoLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulos: TituloFinanceiro[];
  onSuccess: () => void;
}

type StatusItem = 'pendente' | 'processando' | 'sucesso' | 'erro' | 'requer_autorizacao';

interface ResultadoItem {
  titulo: TituloFinanceiro;
  status: StatusItem;
  mensagem?: string;
}

const formasPagamento: { value: FormaPagamento; label: string }[] = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'TRANSFERENCIA', label: 'Transferência Bancária' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DEPOSITO', label: 'Depósito' },
];

/**
 * Liquida vários títulos de uma vez, com a mesma data/forma/conta de pagamento — cada um
 * pelo seu próprio valor_atual (sem juros/multa/desconto por item; quem precisar disso
 * liquida individualmente pelo modal de baixa único). Reaproveita a mesma RPC
 * `financeiro_liquidar_titulo` do fluxo individual, chamada uma vez por título em
 * sequência (nunca em paralelo — evita corrida na mesma conta bancária), com idempotency
 * key própria por item. Título que exigir autorização (baixa retroativa) não trava o lote:
 * fica marcado "requer autorização" no resultado, e precisa ser liquidado individualmente.
 */
export const LiquidacaoLoteModal = ({ isOpen, onClose, titulos, onSuccess }: LiquidacaoLoteModalProps) => {
  const [itensRemovidos, setItensRemovidos] = useState<Set<string>>(new Set());
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [processando, setProcessando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoItem[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setItensRemovidos(new Set());
    setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
    setFormaPagamento('DINHEIRO');
    setContaBancariaId('');
    setProcessando(false);
    setResultados(null);
  }, [isOpen]);

  const { data: contasBancarias = [] } = useQuery({
    queryKey: ['contas-bancarias-ativas'],
    queryFn: listarContasBancariasAtivasComAgenciaBanco,
    enabled: isOpen,
  });

  const itensSelecionados = titulos.filter((t) => !itensRemovidos.has(t.id));
  const totalSelecionado = itensSelecionados.reduce((soma, t) => soma + (t.valor_atual ?? t.valor_original), 0);
  const necessitaContaBancaria = formaPagamento !== 'DINHEIRO';
  const podeConfirmar = itensSelecionados.length > 0 && (!necessitaContaBancaria || !!contaBancariaId);

  const remover = (id: string) => setItensRemovidos((prev) => new Set(prev).add(id));

  const executarLote = async () => {
    setProcessando(true);
    const pendentes: ResultadoItem[] = itensSelecionados.map((titulo) => ({ titulo, status: 'pendente' }));
    setResultados(pendentes);

    for (let i = 0; i < pendentes.length; i++) {
      const item = pendentes[i];
      setResultados((prev) => prev!.map((r, idx) => (idx === i ? { ...r, status: 'processando' } : r)));

      try {
        await movimentacoesService.liquidarTitulo({
          titulo_id: item.titulo.id,
          tipo_titulo: item.titulo.tipo,
          idempotency_key: crypto.randomUUID(),
          valor_pago: item.titulo.valor_atual ?? item.titulo.valor_original,
          data_pagamento: dataPagamento,
          forma_pagamento: formaPagamento,
          conta_bancaria_id: necessitaContaBancaria ? contaBancariaId : undefined,
        });
        setResultados((prev) => prev!.map((r, idx) => (idx === i ? { ...r, status: 'sucesso' } : r)));
      } catch (error) {
        if (error instanceof AutorizacaoRequeridaError) {
          setResultados((prev) =>
            prev!.map((r, idx) =>
              idx === i
                ? { ...r, status: 'requer_autorizacao', mensagem: 'Exige autorização — liquide individualmente.' }
                : r,
            ),
          );
        } else {
          setResultados((prev) =>
            prev!.map((r, idx) =>
              idx === i ? { ...r, status: 'erro', mensagem: error instanceof Error ? error.message : 'Erro desconhecido' } : r,
            ),
          );
        }
      }
    }

    setProcessando(false);
    onSuccess();
  };

  const concluido = resultados !== null && !processando;
  const totalSucesso = resultados?.filter((r) => r.status === 'sucesso').length ?? 0;
  const totalErro = resultados?.filter((r) => r.status === 'erro' || r.status === 'requer_autorizacao').length ?? 0;

  const statusIcon = (status: StatusItem) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle2 className="w-4 h-4 text-status-delivered shrink-0" />;
      case 'erro':
        return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
      case 'requer_autorizacao':
        return <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'processando':
        return <Loader2 className="w-4 h-4 animate-spin shrink-0" />;
      default:
        return <div className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processando && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {resultados
              ? `Liquidar em lote — ${resultados.length} título${resultados.length === 1 ? '' : 's'}`
              : `Liquidar em lote — ${itensSelecionados.length} título${itensSelecionados.length === 1 ? '' : 's'}`}
          </DialogTitle>
          <DialogDescription>
            Mesma data, forma e conta de pagamento para todos os títulos selecionados. Cada um é
            liquidado pelo seu próprio saldo — revise a lista antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {!resultados ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lote-data-pagamento">Data do Pagamento *</Label>
                <Input
                  id="lote-data-pagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lote-forma-pagamento">Forma de Pagamento *</Label>
                <Select value={formaPagamento} onValueChange={(v: FormaPagamento) => setFormaPagamento(v)}>
                  <SelectTrigger id="lote-forma-pagamento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map((forma) => (
                      <SelectItem key={forma.value} value={forma.value}>
                        {forma.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {necessitaContaBancaria && (
                <div className="md:col-span-2">
                  <Label htmlFor="lote-conta-bancaria">Conta Bancária *</Label>
                  <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                    <SelectTrigger id="lote-conta-bancaria">
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.agencias_bancarias?.bancos?.nome} — CC: {conta.numero_conta}-{conta.digito}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-[200px] border rounded-md">
              <div className="divide-y">
                {itensSelecionados.map((titulo) => (
                  <div key={titulo.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{titulo.numero_documento}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {titulo.pessoa?.nome || 'Não informado'} · Venc: {format(new Date(titulo.data_vencimento), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold">
                        {currencyUtils.formatCurrency(titulo.valor_atual ?? titulo.valor_original)}
                      </span>
                      <Button type="button" size="icon" variant="ghost" onClick={() => remover(titulo.id)} title="Remover da seleção">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total a liquidar</span>
              <span className="font-semibold text-lg">{currencyUtils.formatCurrency(totalSelecionado)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={executarLote} disabled={!podeConfirmar}>
                Confirmar Liquidação de {itensSelecionados.length} Título{itensSelecionados.length === 1 ? '' : 's'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-[200px] border rounded-md">
              <div className="divide-y">
                {resultados.map((item) => (
                  <div key={item.titulo.id} className="flex items-center gap-3 p-3">
                    {statusIcon(item.status)}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{item.titulo.numero_documento}</div>
                      {item.mensagem && <div className="text-xs text-muted-foreground">{item.mensagem}</div>}
                    </div>
                    <span className="text-sm shrink-0">
                      {currencyUtils.formatCurrency(item.titulo.valor_atual ?? item.titulo.valor_original)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {concluido && (
              <div className="flex items-center gap-4 border-t pt-3 text-sm">
                <Badge variant="default">{totalSucesso} liquidado{totalSucesso === 1 ? '' : 's'}</Badge>
                {totalErro > 0 && <Badge variant="destructive">{totalErro} não processado{totalErro === 1 ? '' : 's'}</Badge>}
              </div>
            )}

            <DialogFooter>
              <Button type="button" onClick={onClose} disabled={processando}>
                {processando ? 'Processando...' : 'Concluir'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
