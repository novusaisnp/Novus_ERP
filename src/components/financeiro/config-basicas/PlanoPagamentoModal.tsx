
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { PlanoPagamento, PlanoPagamentoInput } from '@/types/configBasicas';

console.log('[PlanoPagamentoModal] Componente inicializado');

interface PlanoPagamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  plano: PlanoPagamento | null;
  onSubmit: (data: PlanoPagamentoInput) => void;
  isLoading: boolean;
}

export const PlanoPagamentoModal: React.FC<PlanoPagamentoModalProps> = ({
  isOpen,
  onClose,
  plano,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PlanoPagamentoInput>({
    defaultValues: {
      nome: '',
      ativo: true,
    }
  });

  React.useEffect(() => {
    if (plano) {
      console.log('[PlanoPagamentoModal] Carregando dados para edição:', plano.id);
      reset({
        nome: plano.nome,
        ativo: plano.ativo,
      });
    } else {
      reset({
        nome: '',
        ativo: true,
      });
    }
  }, [plano, reset]);

  const handleFormSubmit = (data: PlanoPagamentoInput) => {
    console.log('[PlanoPagamentoModal] Submetendo formulário:', data);
    onSubmit(data);
  };

  const watchedValues = watch();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {plano ? 'Editar Plano de Pagamento' : 'Novo Plano de Pagamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Plano *</Label>
            <Input
              id="nome"
              {...register('nome', { required: 'Nome do plano é obrigatório' })}
              placeholder="Digite o nome do plano"
            />
            {errors.nome && (
              <span className="text-sm text-destructive">{errors.nome.message}</span>
            )}
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
