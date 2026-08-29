
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Cargo, CargoCategoriaPadrao } from '@/types/rh';
import { useCargos } from '@/hooks/useCargos';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { FormCargoFields } from './FormCargoFields';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome do cargo é obrigatório'),
  descricao: z.string().optional(),
  salarioBase: z.string().optional(),
  categoriaPadrao: z.custom<CargoCategoriaPadrao>().nullish(),
});

type FormData = z.infer<typeof formSchema>;

interface FormCargoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cargo?: Cargo | null;
  onSuccess?: () => void;
}

const FormCargo: React.FC<FormCargoProps> = ({
  open,
  onOpenChange,
  cargo,
  onSuccess,
}) => {
  const { saveCargo, loading } = useCargos();
  const { toast } = useToast();


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      salarioBase: '',
      categoriaPadrao: null,
    },
  });

  // Reset form when cargo changes or modal opens/closes
  React.useEffect(() => {

    if (open) {
      const formData: FormData = {
        nome: cargo?.nome || '',
        descricao: cargo?.descricao || '',
        salarioBase: cargo?.salarioBase?.toString() || '',
        categoriaPadrao: cargo?.categoriaPadrao ?? null,
      };

      form.reset(formData);
    } else {
      // Limpa o formulário quando fecha
      form.reset({
        nome: '',
        descricao: '',
        salarioBase: '',
        categoriaPadrao: null,
      });
    }
  }, [cargo, open, form]);

  const handleSubmit = async (data: FormData) => {
    
    const salarioBaseValue = data.salarioBase ? parseFloat(data.salarioBase.replace(/[^\d,.-]/g, '').replace(',', '.')) : undefined;
    
    const cargoData: Cargo = {
      id: cargo?.id,
      nome: data.nome.trim(),
      descricao: data.descricao?.trim() || undefined,
      salarioBase: salarioBaseValue,
      categoriaPadrao: data.categoriaPadrao ?? null,
      ativo: cargo?.ativo ?? true,
    };


    const success = await saveCargo(cargoData);
    
    if (success) {
      onOpenChange(false);
      onSuccess?.();
      
      // Toast de sucesso específico para edição/criação
      toast({
        title: "Sucesso!",
        description: cargo?.id ? "Cargo atualizado com sucesso!" : "Cargo criado com sucesso!",
      });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cargo ? `Editar Cargo: ${cargo.nome}` : 'Novo Cargo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormCargoFields form={form as any} loading={loading} />

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cargo ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FormCargo;
