
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

export const NaturezaCaixaModal: React.FC<NaturezaCaixaModalProps> = ({
  isOpen,
  onClose,
  natureza,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<NaturezaCaixaInput>({
    defaultValues: {
      nome: '',
      sigla: '',
      baixa: false,
      gera_troco: false,
      informa_valor_pago: false,
      baixa_pendente: false,
      pagamento_online: false,
      conta_convenio: false,
      mostra_troco: false,
      forma_nota_fiscal: false,
      ativo: true,
    }
  });

  React.useEffect(() => {
    if (natureza) {
      console.log('[NaturezaCaixaModal] Carregando dados para edição:', natureza.id);
      reset({
        nome: natureza.nome,
        sigla: natureza.sigla,
        baixa: natureza.baixa,
        gera_troco: natureza.gera_troco,
        informa_valor_pago: natureza.informa_valor_pago,
        baixa_pendente: natureza.baixa_pendente,
        pagamento_online: natureza.pagamento_online,
        conta_convenio: natureza.conta_convenio,
        mostra_troco: natureza.mostra_troco,
        forma_nota_fiscal: natureza.forma_nota_fiscal,
        ativo: natureza.ativo,
      });
    } else {
      reset({
        nome: '',
        sigla: '',
        baixa: false,
        gera_troco: false,
        informa_valor_pago: false,
        baixa_pendente: false,
        pagamento_online: false,
        conta_convenio: false,
        mostra_troco: false,
        forma_nota_fiscal: false,
        ativo: true,
      });
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
            <h4 className="font-medium">Configurações Operacionais</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="baixa" className="text-sm">Baixa</Label>
                <Switch
                  id="baixa"
                  checked={watchedValues.baixa}
                  onCheckedChange={(checked) => setValue('baixa', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="gera_troco" className="text-sm">Gera Troco</Label>
                <Switch
                  id="gera_troco"
                  checked={watchedValues.gera_troco}
                  onCheckedChange={(checked) => setValue('gera_troco', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="informa_valor_pago" className="text-sm">Informa Valor Pago</Label>
                <Switch
                  id="informa_valor_pago"
                  checked={watchedValues.informa_valor_pago}
                  onCheckedChange={(checked) => setValue('informa_valor_pago', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="baixa_pendente" className="text-sm">Baixa Pendente</Label>
                <Switch
                  id="baixa_pendente"
                  checked={watchedValues.baixa_pendente}
                  onCheckedChange={(checked) => setValue('baixa_pendente', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="pagamento_online" className="text-sm">Pagamento Online</Label>
                <Switch
                  id="pagamento_online"
                  checked={watchedValues.pagamento_online}
                  onCheckedChange={(checked) => setValue('pagamento_online', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="conta_convenio" className="text-sm">Conta Convênio</Label>
                <Switch
                  id="conta_convenio"
                  checked={watchedValues.conta_convenio}
                  onCheckedChange={(checked) => setValue('conta_convenio', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mostra_troco" className="text-sm">Mostra Troco</Label>
                <Switch
                  id="mostra_troco"
                  checked={watchedValues.mostra_troco}
                  onCheckedChange={(checked) => setValue('mostra_troco', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="forma_nota_fiscal" className="text-sm">Força Nota Fiscal</Label>
                <Switch
                  id="forma_nota_fiscal"
                  checked={watchedValues.forma_nota_fiscal}
                  onCheckedChange={(checked) => setValue('forma_nota_fiscal', checked)}
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
