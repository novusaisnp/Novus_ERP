
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

const emptyForm: ModalidadeCaixaInput = {
  nome: '',
  descricao: '',
  tipo: '',
  ativo: true,
};

export const ModalidadeCaixaModal: React.FC<ModalidadeCaixaModalProps> = ({
  isOpen,
  onClose,
  modalidade,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ModalidadeCaixaInput>({
    defaultValues: emptyForm,
  });

  React.useEffect(() => {
    if (modalidade) {
      console.log('[ModalidadeCaixaModal] Carregando dados para edição:', modalidade.id);
      reset({
        nome: modalidade.nome,
        descricao: modalidade.descricao ?? '',
        tipo: modalidade.tipo ?? '',
        ativo: modalidade.ativo,
      });
    } else {
      reset(emptyForm);
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
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                {...register('tipo')}
                placeholder="Ex.: DINHEIRO, CARTAO, PIX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                {...register('descricao')}
                placeholder="Descrição opcional"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo" className="text-sm">Ativo</Label>
            <Switch
              id="ativo"
              checked={watchedValues.ativo}
              onCheckedChange={(checked) => setValue('ativo', checked)}
            />
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
