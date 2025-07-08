
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
import type { Localizacao } from '@/services/localizacaoService';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormLocalizacaoProps {
  open: boolean;
  onClose: () => void;
  localizacao?: Localizacao | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export const FormLocalizacao: React.FC<FormLocalizacaoProps> = ({
  open,
  onClose,
  localizacao,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: localizacao?.nome || '',
      descricao: localizacao?.descricao || '',
    },
  });

  React.useEffect(() => {
    if (localizacao) {
      form.reset({
        nome: localizacao.nome,
        descricao: localizacao.descricao || '',
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
      });
    }
  }, [localizacao, form]);

  const handleSubmit = (data: FormData) => {
    console.log('[FormLocalizacao] Dados do formulário:', data);
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {localizacao ? 'Editar Localização' : 'Nova Localização'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Localização *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Depósito Geral, Câmara Fria"
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
                      placeholder="Descreva a localização (opcional)"
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
                {localizacao ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
