
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import type { ModalidadeAPIVinculo, ModalidadeAPIVinculoInput } from '@/types/configBasicas';

console.log('[ModalidadeAPIModal] Componente inicializado');

interface ModalidadeAPIModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalidade: ModalidadeAPIVinculo | null;
  onSubmit: (data: ModalidadeAPIVinculoInput) => void;
  isLoading: boolean;
}

export const ModalidadeAPIModal: React.FC<ModalidadeAPIModalProps> = ({
  isOpen,
  onClose,
  modalidade,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ModalidadeAPIVinculoInput>({
    defaultValues: {
      nome: '',
      codigo_externo: '',
      descricao: '',
      ativo: true,
    }
  });

  React.useEffect(() => {
    if (modalidade) {
      console.log('[ModalidadeAPIModal] Carregando dados para edição:', modalidade.id);
      reset({
        nome: modalidade.nome,
        codigo_externo: modalidade.codigo_externo || '',
        descricao: modalidade.descricao || '',
        ativo: modalidade.ativo,
      });
    } else {
      reset({
        nome: '',
        codigo_externo: '',
        descricao: '',
        ativo: true,
      });
    }
  }, [modalidade, reset]);

  const handleFormSubmit = (data: ModalidadeAPIVinculoInput) => {
    console.log('[ModalidadeAPIModal] Submetendo formulário:', data);
    onSubmit(data);
  };

  const watchedValues = watch();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modalidade ? 'Editar Modalidade API Vínculo' : 'Nova Modalidade API Vínculo'}
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
              <Label htmlFor="codigo_externo">Código Externo</Label>
              <Input
                id="codigo_externo"
                {...register('codigo_externo')}
                placeholder="Código usado na API externa (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register('descricao')}
                placeholder="Descrição da modalidade (opcional)"
                rows={3}
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
