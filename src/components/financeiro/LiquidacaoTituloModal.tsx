import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { listarContasBancariasAtivasComAgenciaBanco } from '@/services/contaBancariaService';
import { movimentacoesService } from '@/services/movimentacoesService';
import { listarMovimentacoesDisponiveisParaVinculo } from '@/services/movimentacoesBancariasService';
import { qk } from '@/lib/queryKeys';
import { TituloFinanceiro, LiquidacaoTitulo, FormaPagamento, MultiBaixa } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';
import { useAutorizacaoFinanceira } from '@/hooks/useAutorizacaoFinanceira';
import { AutorizacaoFinanceiraModal } from './AutorizacaoFinanceiraModal';

interface LiquidacaoTituloModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: TituloFinanceiro;
  onSuccess: () => void;
}

export const LiquidacaoTituloModal = ({ 
  isOpen, 
  onClose, 
  titulo, 
  onSuccess 
}: LiquidacaoTituloModalProps) => {
  console.log('[LiquidacaoTituloModal] Renderizando modal para título:', titulo.id);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const idempotencyKey = useRef(crypto.randomUUID());

  const [formData, setFormData] = useState({
    valor_pago: titulo.valor_atual ?? titulo.valor_original,
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    forma_pagamento: 'DINHEIRO' as FormaPagamento,
    conta_bancaria_id: '',
    observacoes: '',
    juros: 0,
    multa: 0,
    desconto: 0,
  });

  /** Divisão do pagamento entre contas bancárias; vazia = uma conta só. */
  const [divisao, setDivisao] = useState<MultiBaixa[]>([]);

  /** 'nova' cria uma movimentação (padrão, como sempre foi); 'vincular' usa uma já existente sem título. */
  const [modoMovimentacao, setModoMovimentacao] = useState<'nova' | 'vincular'>('nova');
  const [movimentacaoVinculadaId, setMovimentacaoVinculadaId] = useState('');

  // O principal abate o saldo do título; o que circula no banco carrega os acréscimos.
  const valorEfetivo =
    formData.valor_pago + formData.juros + formData.multa - formData.desconto;

  const somaDivisao = divisao.reduce((total, parte) => total + (parte.valor || 0), 0);
  const divisaoFecha = Math.abs(somaDivisao - valorEfetivo) < 0.01;

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = crypto.randomUUID();
    setFormData({
      valor_pago: titulo.valor_atual ?? titulo.valor_original,
      data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      forma_pagamento: 'DINHEIRO',
      conta_bancaria_id: '',
      observacoes: '',
      juros: 0,
      multa: 0,
      desconto: 0,
    });
    setDivisao([]);
    setModoMovimentacao('nova');
    setMovimentacaoVinculadaId('');
  }, [isOpen, titulo.id, titulo.valor_atual, titulo.valor_original]);

  // Buscar contas bancárias
  const { data: contasBancarias = [], isLoading: loadingContas } = useQuery({
    queryKey: ['contas-bancarias-ativas'],
    queryFn: listarContasBancariasAtivasComAgenciaBanco,
  });

  // Movimentações já existentes, sem título, no sentido esperado (entrada/saída) —
  // candidatas a vínculo em vez de criar uma movimentação nova e duplicada.
  const tipoMovimentacaoEsperado = titulo.tipo === 'CONTAS_PAGAR' ? 'SAQUE' : 'DEPOSITO';
  const { data: movimentacoesDisponiveis = [], isLoading: loadingMovimentacoes } = useQuery({
    queryKey: ['movimentacoes-disponiveis-vinculo', tipoMovimentacaoEsperado],
    queryFn: () => listarMovimentacoesDisponiveisParaVinculo(tipoMovimentacaoEsperado),
    enabled: isOpen && modoMovimentacao === 'vincular',
  });

  // Mutation para liquidar título
  const liquidarMutation = useMutation({
    mutationFn: async (dadosLiquidacao: LiquidacaoTitulo) => {
      await movimentacoesService.liquidarTitulo(dadosLiquidacao);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Título liquidado com sucesso!",
      });
      // [LOTE 3B] Invalidação refinada por tipo do título + conta bancária afetada.
      queryClient.invalidateQueries({ queryKey: qk.movimentacoesFinanceiras.all });
      if (titulo.tipo === 'CONTAS_PAGAR') {
        queryClient.invalidateQueries({ queryKey: qk.contasPagar.all });
        queryClient.invalidateQueries({ queryKey: qk.contasPagar.stats() });
      } else {
        queryClient.invalidateQueries({ queryKey: qk.contasReceber.all });
        queryClient.invalidateQueries({ queryKey: qk.contasReceber.stats() });
      }
      if (formData.conta_bancaria_id) {
        queryClient.invalidateQueries({ queryKey: qk.contasBancarias.detail(formData.conta_bancaria_id) });
        queryClient.invalidateQueries({ queryKey: qk.contasBancarias.stats() });
      }
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      // Falta de autorização não é falha: o diálogo assume e a operação é repetida com ticket.
      if (autorizacao.tratarErro(error)) return;
      toast({
        title: "Erro",
        description: error.message || "Erro ao liquidar título",
        variant: "destructive",
      });
    },
  });

  const autorizacao = useAutorizacaoFinanceira<LiquidacaoTitulo>((vars) =>
    liquidarMutation.mutate(vars),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // SM1-C: guard de idempotência — impede tentativa duplicada de liquidação
    const situacao = String(titulo.situacao || '').toUpperCase();
    if (situacao === 'LIQUIDADA' || situacao === 'BAIXADA' || situacao === 'PAGA') {
      toast({
        title: 'Título já liquidado',
        description: 'Este título já foi baixado e não pode ser liquidado novamente.',
        variant: 'destructive',
      });
      return;
    }
    if (liquidarMutation.isPending) {
      return; // evita duplo submit por clique rápido
    }

    const usandoDivisao = divisao.length > 0;
    const usandoVinculo = modoMovimentacao === 'vincular';

    if (usandoVinculo) {
      if (!movimentacaoVinculadaId) {
        toast({
          title: 'Selecione a movimentação',
          description: 'Escolha a movimentação bancária existente para vincular a esta liquidação.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!usandoDivisao && !formData.conta_bancaria_id && formData.forma_pagamento !== 'DINHEIRO') {
      toast({
        title: "Erro",
        description: "Selecione uma conta bancária para esta forma de pagamento",
        variant: "destructive",
      });
      return;
    }

    if (usandoDivisao) {
      if (divisao.some((parte) => !parte.conta_bancaria_id || parte.valor <= 0)) {
        toast({
          title: 'Divisão incompleta',
          description: 'Cada linha da divisão precisa de conta bancária e valor maior que zero.',
          variant: 'destructive',
        });
        return;
      }
      // O banco recusa divisão que não fecha; avisar antes evita uma ida à toa.
      if (!divisaoFecha) {
        toast({
          title: 'Divisão não fecha',
          description: `A soma das contas (${currencyUtils.formatCurrency(somaDivisao)}) precisa ser igual ao valor a movimentar (${currencyUtils.formatCurrency(valorEfetivo)}).`,
          variant: 'destructive',
        });
        return;
      }
    }

    const dadosLiquidacao: LiquidacaoTitulo = {
      titulo_id: titulo.id,
      tipo_titulo: titulo.tipo,
      idempotency_key: idempotencyKey.current,
      valor_pago: formData.valor_pago,
      data_pagamento: formData.data_pagamento,
      forma_pagamento: formData.forma_pagamento,
      conta_bancaria_id: usandoDivisao || usandoVinculo ? undefined : formData.conta_bancaria_id || undefined,
      movimentacao_bancaria_id: usandoVinculo ? movimentacaoVinculadaId : undefined,
      observacoes: formData.observacoes || undefined,
      juros: formData.juros || undefined,
      multa: formData.multa || undefined,
      desconto: formData.desconto || undefined,
      multi_baixa: usandoDivisao ? divisao : undefined,
    };

    autorizacao.disparar(dadosLiquidacao);
  };


  const formasPagamento = [
    { value: 'DINHEIRO' as FormaPagamento, label: 'Dinheiro' },
    { value: 'TRANSFERENCIA' as FormaPagamento, label: 'Transferência Bancária' },
    { value: 'CARTAO_CREDITO' as FormaPagamento, label: 'Cartão de Crédito' },
    { value: 'CARTAO_DEBITO' as FormaPagamento, label: 'Cartão de Débito' },
    { value: 'BOLETO' as FormaPagamento, label: 'Boleto' },
    { value: 'PIX' as FormaPagamento, label: 'PIX' },
    { value: 'CHEQUE' as FormaPagamento, label: 'Cheque' },
    { value: 'DEPOSITO' as FormaPagamento, label: 'Depósito' },
  ];

  // Com a divisão em uso, a conta é escolhida linha a linha; a conta única sai de cena.
  const necessitaContaBancaria = formData.forma_pagamento !== 'DINHEIRO' && divisao.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Baixar Título: {titulo.numero_documento}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do Título */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações do Título</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Valor Original:</span>
                  <div className="font-semibold">{currencyUtils.formatCurrency(titulo.valor_original)}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Vencimento:</span>
                  <div className="font-semibold">{format(new Date(titulo.data_vencimento), 'dd/MM/yyyy')}</div>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Pessoa:</span>
                <div className="font-semibold">{titulo.pessoa?.nome || 'Não informado'}</div>
              </div>
              <div className="flex gap-2">
                <Badge variant={titulo.tipo === 'CONTAS_PAGAR' ? 'destructive' : 'default'}>
                  {titulo.tipo === 'CONTAS_PAGAR' ? 'A Pagar' : 'A Receber'}
                </Badge>
                <Badge variant="outline">{titulo.situacao}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Dados da Liquidação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valor_pago">Valor a Pagar/Receber *</Label>
              <CurrencyInput
                id="valor_pago"
                data-testid="liquidacao-valor-input"
                value={formData.valor_pago}
                onValueChange={(v) => setFormData(prev => ({ ...prev, valor_pago: v }))}
                placeholder="R$ 0,00"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Principal, o que abate do saldo do título.
              </p>
            </div>

            <div>
              <Label htmlFor="data_pagamento">Data do Pagamento *</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  data_pagamento: e.target.value 
                }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value: FormaPagamento) => setFormData(prev => ({ 
                  ...prev, 
                  forma_pagamento: value,
                  conta_bancaria_id: value === 'DINHEIRO' ? '' : prev.conta_bancaria_id
                }))}
              >
                <SelectTrigger>
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
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="conta_bancaria">
                    {modoMovimentacao === 'vincular' ? 'Movimentação Bancária *' : 'Conta Bancária *'}
                  </Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={modoMovimentacao === 'nova' ? 'secondary' : 'ghost'}
                      onClick={() => setModoMovimentacao('nova')}
                    >
                      Nova movimentação
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={modoMovimentacao === 'vincular' ? 'secondary' : 'ghost'}
                      onClick={() => {
                        setModoMovimentacao('vincular');
                        setFormData(prev => ({ ...prev, conta_bancaria_id: '' }));
                      }}
                    >
                      Vincular existente
                    </Button>
                  </div>
                </div>

                {modoMovimentacao === 'nova' ? (
                  <Select
                    value={formData.conta_bancaria_id}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      conta_bancaria_id: value
                    }))}
                  >
                    <SelectTrigger id="conta_bancaria">
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBancarias.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.agencias_bancarias?.bancos?.nome} -
                          Ag: {conta.agencias_bancarias?.numero_agencia} -
                          CC: {conta.numero_conta}-{conta.digito} -
                          {conta.cpf_cnpj_titular}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Select value={movimentacaoVinculadaId} onValueChange={setMovimentacaoVinculadaId}>
                      <SelectTrigger id="conta_bancaria">
                        <SelectValue placeholder={loadingMovimentacoes ? 'Carregando...' : 'Selecione a movimentação'} />
                      </SelectTrigger>
                      <SelectContent>
                        {movimentacoesDisponiveis.map((mov) => (
                          <SelectItem key={mov.id} value={mov.id}>
                            {format(new Date(mov.data_movimentacao), 'dd/MM/yyyy')} — {currencyUtils.formatCurrency(mov.valor)} — {mov.descricao}
                            {mov.conta_bancaria?.titular ? ` (${mov.conta_bancaria.titular})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Só aparecem movimentações sem título vinculado. O valor precisa bater exatamente com{' '}
                      {currencyUtils.formatCurrency(valorEfetivo)} (o que vai circular no banco nesta baixa).
                    </p>
                    {!loadingMovimentacoes && movimentacoesDisponiveis.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Nenhuma movimentação sem título disponível nesse sentido. Use "Nova movimentação".
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Acréscimos e abatimento: não mexem no saldo do título, só no que circula. */}
          <div className="rounded-md border p-4 space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="juros">Juros</Label>
                <CurrencyInput
                  id="juros"
                  value={formData.juros}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, juros: v }))}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label htmlFor="multa">Multa</Label>
                <CurrencyInput
                  id="multa"
                  value={formData.multa}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, multa: v }))}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label htmlFor="desconto">Desconto</Label>
                <CurrencyInput
                  id="desconto"
                  value={formData.desconto}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, desconto: v }))}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Valor a movimentar no banco</span>
              <span className="font-semibold" data-testid="liquidacao-valor-efetivo">
                {currencyUtils.formatCurrency(valorEfetivo)}
              </span>
            </div>
          </div>

          {/* Divisão entre contas: a soma tem de fechar com o valor a movimentar. Não combina com vínculo a movimentação existente (uma única movimentação, não dá pra dividir uma já criada). */}
          {modoMovimentacao === 'nova' && (
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dividir entre contas</Label>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para usar uma conta só.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDivisao(prev => [...prev, { conta_bancaria_id: '', valor: 0 }])
                }
              >
                Adicionar conta
              </Button>
            </div>

            {divisao.map((parte, indice) => (
              <div key={indice} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_10rem_auto]">
                <Select
                  value={parte.conta_bancaria_id}
                  onValueChange={(value) =>
                    setDivisao(prev =>
                      prev.map((p, i) => (i === indice ? { ...p, conta_bancaria_id: value } : p)),
                    )
                  }
                >
                  <SelectTrigger>
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

                <CurrencyInput
                  value={parte.valor}
                  onValueChange={(v) =>
                    setDivisao(prev => prev.map((p, i) => (i === indice ? { ...p, valor: v } : p)))
                  }
                  placeholder="R$ 0,00"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDivisao(prev => prev.filter((_, i) => i !== indice))}
                >
                  Remover
                </Button>
              </div>
            ))}

            {divisao.length > 0 && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Soma das contas</span>
                <span className={divisaoFecha ? 'font-semibold' : 'font-semibold text-destructive'}>
                  {currencyUtils.formatCurrency(somaDivisao)}
                  {!divisaoFecha && ` — precisa somar ${currencyUtils.formatCurrency(valorEfetivo)}`}
                </span>
              </div>
            )}
          </div>
          )}

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre a liquidação..."
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                observacoes: e.target.value 
              }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              className="h-10 w-full"
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={liquidarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="h-10 w-full"
              type="submit"
              disabled={liquidarMutation.isPending || loadingContas}
              data-testid="liquidacao-confirmar-btn"
            >
              {liquidarMutation.isPending ? 'Processando...' : 'Liquidar Título'}
            </Button>
          </div>
        </form>
      </DialogContent>

      <AutorizacaoFinanceiraModal {...autorizacao.modalProps} />
    </Dialog>
  );
};
