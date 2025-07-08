
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
import type { Tamanho } from '@/services/tamanhoService';

const formSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória').max(100, 'Descrição muito longa'),
});

type FormData = z.infer<typeof formSchema>;

interface FormTamanhoProps {
  open: boolean;
  onClose: () => void;
  tamanho?: Tamanho | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const FormTamanho: React.FC<FormTamanhoProps> = ({
  open,
  onClose,
  tamanho,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: tamanho?.descricao || '',
    },
  });

  React.useEffect(() => {
    if (tamanho) {
      form.reset({
        descricao: tamanho.descricao,
      });
    } else {
      form.reset({
        descricao: '',
      });
    }
  }, [tamanho, form]);

  const handleSubmit = (data: FormData) => {
    console.log('[FormTamanho] Dados do formulário:', data);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {tamanho ? 'Editar Tamanho' : 'Novo Tamanho'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Tamanho *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Pequeno, Médio, Grande"
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
                {tamanho ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
