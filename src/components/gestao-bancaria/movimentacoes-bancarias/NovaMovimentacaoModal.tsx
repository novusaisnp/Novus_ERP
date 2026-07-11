import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMovimentacoesBancarias } from '@/hooks/useMovimentacoesBancarias';
import { MovimentacaoBancariaInput, TipoMovimentacao } from '@/types/movimentacoesBancarias';
import { ArrowDownLeft, ArrowUpRight, Settings } from 'lucide-react';

interface ContaOption {
  value: string;
  label: string;
  conta: any;
}

interface NovaMovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contasOptions: ContaOption[];
  onSuccess: () => void;
}

export function NovaMovimentacaoModal({
  isOpen,
  onClose,
  contasOptions,
  onSuccess,
}: NovaMovimentacaoModalProps) {
  const { criar, isCreating } = useMovimentacoesBancarias();
  
  const [formData, setFormData] = useState<MovimentacaoBancariaInput>({
    conta_bancaria_id: '',
    tipo_movimentacao: 'DEPOSITO',
    valor: 0,
    descricao: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    documento_referencia: '',
    observacoes: '',
    conta_destino_id: undefined,
  });

  const tiposMovimentacao: { value: TipoMovimentacao; label: string; icon: React.ReactNode }[] = [
    { 
      value: 'DEPOSITO', 
      label: 'Depósito', 
      icon: <ArrowDownLeft className="h-4 w-4 text-green-600" /> 
    },
    { 
      value: 'SAQUE', 
      label: 'Saque', 
      icon: <ArrowUpRight className="h-4 w-4 text-red-600" /> 
    },
    { 
      value: 'AJUSTE_POSITIVO', 
      label: 'Ajuste Positivo', 
      icon: <Settings className="h-4 w-4 text-green-600" /> 
    },
    { 
      value: 'AJUSTE_NEGATIVO', 
      label: 'Ajuste Negativo', 
      icon: <Settings className="h-4 w-4 text-red-600" /> 
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.conta_bancaria_id || !formData.descricao || formData.valor <= 0) {
      return;
    }

    criar(formData, {
      onSuccess: () => {
        onSuccess();
        handleClose();
      },
    });
  };

  const handleClose = () => {
    setFormData({
      conta_bancaria_id: '',
      tipo_movimentacao: 'DEPOSITO',
      valor: 0,
      descricao: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      documento_referencia: '',
      observacoes: '',
      conta_destino_id: undefined,
    });
    onClose();
  };

  const updateFormData = (field: keyof MovimentacaoBancariaInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Movimentação Bancária</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Movimentação */}
          <div>
            <Label htmlFor="tipo">Tipo de Movimentação</Label>
            <Select
              value={formData.tipo_movimentacao}
              onValueChange={(value: TipoMovimentacao) => updateFormData('tipo_movimentacao', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposMovimentacao.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div className="flex items-center space-x-2">
                      {tipo.icon}
                      <span>{tipo.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conta Bancária */}
          <div>
            <Label htmlFor="conta">Conta Bancária</Label>
            <Select
              value={formData.conta_bancaria_id}
              onValueChange={(value) => updateFormData('conta_bancaria_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {contasOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formData.valor || ''}
                onChange={(e) => updateFormData('valor', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            {/* Data */}
            <div>
              <Label htmlFor="data">Data da Movimentação</Label>
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
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Descrição da movimentação"
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
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.conta_bancaria_id || !formData.descricao || formData.valor <= 0}
            >
              {isCreating ? 'Criando...' : 'Criar Movimentação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}