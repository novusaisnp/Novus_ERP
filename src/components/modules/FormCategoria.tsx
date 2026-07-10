
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Categoria } from '@/services/categoriaService';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormCategoriaProps {
  open: boolean;
  onClose: () => void;
  categoria?: Categoria | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}


export const FormCategoria: React.FC<FormCategoriaProps> = ({
  open,
  onClose,
  categoria,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: categoria?.nome || '',
      descricao: categoria?.descricao || '',
    },
  });

  React.useEffect(() => {
    if (categoria) {
      form.reset({
        nome: categoria.nome,
        descricao: categoria.descricao || '',
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
      });
    }
  }, [categoria, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {categoria ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Categoria *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Bebidas Não Alcoólicas"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a categoria (opcional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {categoria ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
