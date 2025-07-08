
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { ModalidadeCaixa, ModalidadeCaixaInput } from '@/types/configBasicas';

console.log('[ModalidadeCaixaModal] Componente inicializado');

interface ModalidadeCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalidade: ModalidadeCaixa | null;
  onSubmit: (data: ModalidadeCaixaInput) => void;
  isLoading: boolean;
}

export const ModalidadeCaixaModal: React.FC<ModalidadeCaixaModalProps> = ({
  isOpen,
  onClose,
  modalidade,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ModalidadeCaixaInput>({
    defaultValues: {
      nome: '',
      sigla: '',
      ativo: true,
      indica_boleto: false,
      indica_cartao_credito: false,
    }
  });

  React.useEffect(() => {
    if (modalidade) {
      console.log('[ModalidadeCaixaModal] Carregando dados para edição:', modalidade.id);
      reset({
        nome: modalidade.nome,
        sigla: modalidade.sigla,
        ativo: modalidade.ativo,
        indica_boleto: modalidade.indica_boleto,
        indica_cartao_credito: modalidade.indica_cartao_credito,
      });
    } else {
      reset({
        nome: '',
        sigla: '',
        ativo: true,
        indica_boleto: false,
        indica_cartao_credito: false,
      });
    }
  }, [modalidade, reset]);

  const handleFormSubmit = (data: ModalidadeCaixaInput) => {
    console.log('[ModalidadeCaixaModal] Submetendo formulário:', data);
    onSubmit(data);
  };

  const watchedValues = watch();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modalidade ? 'Editar Modalidade de Caixa' : 'Nova Modalidade de Caixa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                {...register('nome', { required: 'Nome é obrigatório' })}
                placeholder="Digite o nome"
              />
              {errors.nome && (
                <span className="text-sm text-destructive">{errors.nome.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sigla">Sigla *</Label>
              <Input
                id="sigla"
                {...register('sigla', { 
                  required: 'Sigla é obrigatória',
                  maxLength: { value: 5, message: 'Máximo 5 caracteres' }
                })}
                placeholder="Até 5 caracteres"
                maxLength={5}
              />
              {errors.sigla && (
                <span className="text-sm text-destructive">{errors.sigla.message}</span>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="ativo" className="text-sm">Ativo</Label>
              <Switch
                id="ativo"
                checked={watchedValues.ativo}
                onCheckedChange={(checked) => setValue('ativo', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="indica_boleto" className="text-sm">Indica se é boleto</Label>
              <Switch
                id="indica_boleto"
                checked={watchedValues.indica_boleto}
                onCheckedChange={(checked) => setValue('indica_boleto', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="indica_cartao_credito" className="text-sm">Indica se é cartão de crédito</Label>
              <Switch
                id="indica_cartao_credito"
                checked={watchedValues.indica_cartao_credito}
                onCheckedChange={(checked) => setValue('indica_cartao_credito', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
