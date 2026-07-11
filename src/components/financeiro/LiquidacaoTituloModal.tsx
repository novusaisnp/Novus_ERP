import { useState } from 'react';
import { format } from 'date-fns';
import { CreditCard, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { movimentacoesService } from '@/services/movimentacoesService';
import { TituloFinanceiro, LiquidacaoTitulo, FormaPagamento } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

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

  const [formData, setFormData] = useState({
    valor_pago: titulo.valor_original,
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    forma_pagamento: 'DINHEIRO' as FormaPagamento,
    conta_bancaria_id: '',
    observacoes: '',
  });

  // Buscar contas bancárias
  const { data: contasBancarias = [], isLoading: loadingContas } = useQuery<any[]>({
    queryKey: ['contas-bancarias-ativas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contas_bancarias')
        .select(`
          id,
          cpf_cnpj_titular,
          numero_conta,
          digito,
          agencia_id,
          agencias_bancarias!inner(
            numero_agencia,
            bancos!inner(nome, codigo)
          )
        `)
        .eq('ativo', true);

      if (error) throw error;
      return data || [];
    },
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
      // Invalidação ampla: listagens, estatísticas e saldos afetados
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
      queryClient.invalidateQueries({ queryKey: ['contas-pagar-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] });
      queryClient.invalidateQueries({ queryKey: ['contas-receber-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias'] });
      queryClient.invalidateQueries({ queryKey: ['contas-bancarias-estatisticas'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao liquidar título",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.conta_bancaria_id && formData.forma_pagamento !== 'DINHEIRO') {
      toast({
        title: "Erro",
        description: "Selecione uma conta bancária para esta forma de pagamento",
        variant: "destructive",
      });
      return;
    }

    const dadosLiquidacao: LiquidacaoTitulo = {
      titulo_id: titulo.id,
      tipo_titulo: titulo.tipo,
      valor_pago: formData.valor_pago,
      data_pagamento: formData.data_pagamento,
      forma_pagamento: formData.forma_pagamento,
      conta_bancaria_id: formData.conta_bancaria_id || undefined,
      observacoes: formData.observacoes || undefined,
    };

    liquidarMutation.mutate(dadosLiquidacao);
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

  const necessitaContaBancaria = formData.forma_pagamento !== 'DINHEIRO';

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
              <Input
                id="valor_pago"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_pago}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  valor_pago: parseFloat(e.target.value) || 0 
                }))}
                required
              />
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
              <div>
                <Label htmlFor="conta_bancaria">Conta Bancária *</Label>
                <Select
                  value={formData.conta_bancaria_id}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    conta_bancaria_id: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contasBancarias.map((conta: any) => (
                      <SelectItem key={conta.id} value={conta.id}>
                        {conta.agencias_bancarias?.bancos?.nome} - 
                        Ag: {conta.agencias_bancarias?.numero_agencia} - 
                        CC: {conta.numero_conta}-{conta.digito} - 
                        {conta.cpf_cnpj_titular}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={liquidarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={liquidarMutation.isPending || loadingContas}
            >
              {liquidarMutation.isPending ? 'Processando...' : 'Liquidar Título'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};