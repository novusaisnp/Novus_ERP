import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useMovimentacoesBancarias } from '@/hooks/useMovimentacoesBancarias';
import { TransferenciaBancaria } from '@/types/movimentacoesBancarias';
import { ArrowRightLeft, ArrowRight } from 'lucide-react';
import { currencyUtils } from '@/utils/currencyUtils';

interface ContaOption {
  value: string;
  label: string;
  conta: any;
}

interface TransferenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contasOptions: ContaOption[];
  onSuccess: () => void;
}

export function TransferenciaModal({
  isOpen,
  onClose,
  contasOptions,
  onSuccess,
}: TransferenciaModalProps) {
  const { realizarTransferencia, isTransferring } = useMovimentacoesBancarias();
  
  const [formData, setFormData] = useState<TransferenciaBancaria>({
    conta_origem_id: '',
    conta_destino_id: '',
    valor: 0,
    descricao: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    documento_referencia: '',
    observacoes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // SM1-A: validações com toast semântico. Sem alert() nativo, sem return silencioso.
    if (!formData.conta_origem_id) {
      toast.error('Selecione a conta de origem.');
      return;
    }
    if (!formData.conta_destino_id) {
      toast.error('Selecione a conta de destino.');
      return;
    }
    if (formData.conta_origem_id === formData.conta_destino_id) {
      toast.error('A conta de origem não pode ser igual à conta de destino.');
      return;
    }
    if (!formData.descricao?.trim()) {
      toast.error('Informe a descrição da transferência.');
      return;
    }
    if (!(formData.valor > 0)) {
      toast.error('O valor deve ser maior que zero.');
      return;
    }
    // Bloqueio de saldo insuficiente quando a conta origem não permite negativo
    const origem = contasOptions.find((c) => c.value === formData.conta_origem_id);
    const permitirNegativo = origem?.conta?.configuracoes?.permitir_saldo_negativo === true;
    if (origem && !permitirNegativo && formData.valor > Number(origem.conta.saldo_atual ?? 0)) {
      toast.error('Saldo insuficiente na conta de origem para esta transferência.');
      return;
    }

    realizarTransferencia(formData, {
      onSuccess: () => {
        onSuccess();
        handleClose();
      },
      // erro: hook dispara toast; modal permanece aberto para correção
    });
  };


  const handleClose = () => {
    setFormData({
      conta_origem_id: '',
      conta_destino_id: '',
      valor: 0,
      descricao: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      documento_referencia: '',
      observacoes: '',
    });
    onClose();
  };

  const updateFormData = (field: keyof TransferenciaBancaria, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const contaOrigem = contasOptions.find(c => c.value === formData.conta_origem_id);
  const contaDestino = contasOptions.find(c => c.value === formData.conta_destino_id);

  const contasOrigemDisponiveis = contasOptions.filter(c => c.value !== formData.conta_destino_id);
  const contasDestinoDisponiveis = contasOptions.filter(c => c.value !== formData.conta_origem_id);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ArrowRightLeft className="h-5 w-5" />
            <span>Nova Transferência Bancária</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Preview da Transferência */}
          {(contaOrigem || contaDestino) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview da Transferência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-sm font-medium">Conta Origem</div>
                    <div className="text-xs text-muted-foreground">
                      {contaOrigem?.label || 'Selecione a origem'}
                    </div>
                    {contaOrigem && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Saldo: {currencyUtils.formatCurrency(contaOrigem.conta.saldo_atual)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center mx-4">
                    <ArrowRight className="h-6 w-6 text-blue-600" />
                    {formData.valor > 0 && (
                      <div className="text-sm font-bold text-blue-600 mt-1">
                        {currencyUtils.formatCurrency(formData.valor)}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center flex-1">
                    <div className="text-sm font-medium">Conta Destino</div>
                    <div className="text-xs text-muted-foreground">
                      {contaDestino?.label || 'Selecione o destino'}
                    </div>
                    {contaDestino && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Saldo: {currencyUtils.formatCurrency(contaDestino.conta.saldo_atual)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Conta Origem */}
            <div>
              <Label htmlFor="conta-origem">Conta de Origem</Label>
              <Select
                value={formData.conta_origem_id}
                onValueChange={(value) => updateFormData('conta_origem_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {contasOrigemDisponiveis.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          Saldo: {currencyUtils.formatCurrency(option.conta.saldo_atual)}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conta Destino */}
            <div>
              <Label htmlFor="conta-destino">Conta de Destino</Label>
              <Select
                value={formData.conta_destino_id}
                onValueChange={(value) => updateFormData('conta_destino_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  {contasDestinoDisponiveis.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          Saldo: {currencyUtils.formatCurrency(option.conta.saldo_atual)}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <Label htmlFor="valor">Valor da Transferência</Label>
              <CurrencyInput
                id="valor"
                placeholder="R$ 0,00"
                value={formData.valor ?? 0}
                onValueChange={(v) => updateFormData('valor', v)}
                required
              />
              {contaOrigem && formData.valor > contaOrigem.conta.saldo_atual && (
                <p className="text-xs text-red-600 mt-1">
                  Valor excede o saldo disponível na conta origem
                </p>
              )}
            </div>

            {/* Data */}
            <div>
              <Label htmlFor="data">Data da Transferência</Label>
              <Input
                id="data"
                type="date"
                value={formData.data_movimentacao}
                onChange={(e) => updateFormData('data_movimentacao', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="descricao">Descrição da Transferência</Label>
            <Input
              id="descricao"
              placeholder="Motivo da transferência"
              value={formData.descricao}
              onChange={(e) => updateFormData('descricao', e.target.value)}
              required
            />
          </div>

          {/* Documento de Referência */}
          <div>
            <Label htmlFor="documento">Documento de Referência</Label>
            <Input
              id="documento"
              placeholder="Número do documento (opcional)"
              value={formData.documento_referencia}
              onChange={(e) => updateFormData('documento_referencia', e.target.value)}
            />
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações adicionais (opcional)"
              value={formData.observacoes}
              onChange={(e) => updateFormData('observacoes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isTransferring}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isTransferring || 
                !formData.conta_origem_id || 
                !formData.conta_destino_id || 
                !formData.descricao || 
                formData.valor <= 0 ||
                formData.conta_origem_id === formData.conta_destino_id ||
                (contaOrigem && formData.valor > contaOrigem.conta.saldo_atual)
              }
            >
              {isTransferring ? 'Realizando...' : 'Realizar Transferência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}