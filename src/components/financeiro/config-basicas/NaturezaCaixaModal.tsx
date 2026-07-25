
import React from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { NaturezaCaixa, NaturezaCaixaInput } from '@/types/configBasicas';

console.log('[NaturezaCaixaModal] Componente inicializado');

interface NaturezaCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  natureza: NaturezaCaixa | null;
  onSubmit: (data: NaturezaCaixaInput) => void;
  isLoading: boolean;
}

const emptyForm: NaturezaCaixaInput = {
  nome: '',
  codigo: '',
  descricao: '',
  tipo: '',
  permite_estorno: false,
  requer_documento: false,
  ativo: true,
};

export const NaturezaCaixaModal: React.FC<NaturezaCaixaModalProps> = ({
  isOpen,
  onClose,
  natureza,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<NaturezaCaixaInput>({
    defaultValues: emptyForm,
  });

  React.useEffect(() => {
    if (natureza) {
      console.log('[NaturezaCaixaModal] Carregando dados para edição:', natureza.id);
      reset({
        nome: natureza.nome,
        codigo: natureza.codigo ?? '',
        descricao: natureza.descricao ?? '',
        tipo: natureza.tipo ?? '',
        permite_estorno: natureza.permite_estorno,
        requer_documento: natureza.requer_documento,
        ativo: natureza.ativo,
      });
    } else {
      reset(emptyForm);
    }
  }, [natureza, reset]);

  const handleFormSubmit = (data: NaturezaCaixaInput) => {
    console.log('[NaturezaCaixaModal] Submetendo formulário:', data);
    onSubmit(data);
  };

  const watchedValues = watch();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {natureza ? 'Editar Natureza de Caixa' : 'Nova Natureza de Caixa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                {...register('codigo')}
                placeholder="Código interno"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              {...register('descricao')}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Input
              id="tipo"
              {...register('tipo')}
              placeholder="Classificação da natureza"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Configurações</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="permite_estorno" className="text-sm">Permite Estorno</Label>
                <Switch
                  id="permite_estorno"
                  checked={watchedValues.permite_estorno}
                  onCheckedChange={(checked) => setValue('permite_estorno', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="requer_documento" className="text-sm">Requer Documento</Label>
                <Switch
                  id="requer_documento"
                  checked={watchedValues.requer_documento}
                  onCheckedChange={(checked) => setValue('requer_documento', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo" className="text-sm font-medium">Ativo</Label>
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
