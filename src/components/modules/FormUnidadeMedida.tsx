
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { UnidadeMedida } from '@/services/unidadeMedidaService';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  sigla: z.string().min(1, 'Sigla é obrigatória').max(10, 'Sigla muito longa'),
});

type FormData = z.infer<typeof formSchema>;

interface FormUnidadeMedidaProps {
  open: boolean;
  onClose: () => void;
  unidadeMedida?: UnidadeMedida | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const FormUnidadeMedida: React.FC<FormUnidadeMedidaProps> = ({
  open,
  onClose,
  unidadeMedida,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: unidadeMedida?.nome || '',
      sigla: unidadeMedida?.sigla || '',
    },
  });

  React.useEffect(() => {
    if (unidadeMedida) {
      form.reset({
        nome: unidadeMedida.nome,
        sigla: unidadeMedida.sigla,
      });
    } else {
      form.reset({
        nome: '',
        sigla: '',
      });
    }
  }, [unidadeMedida, form]);

  const handleSubmit = (data: FormData) => {
    console.log('[FormUnidadeMedida] Dados do formulário:', data);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {unidadeMedida ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Quilograma"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sigla"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sigla *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: KG"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {unidadeMedida ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
