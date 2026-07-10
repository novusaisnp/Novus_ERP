
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

// Função helper para converter regras_tributacao do banco para o formato do formulário
const parseRegrasTributacao = (regras: any) => {
  if (!regras || typeof regras !== 'object') {
    return {};
  }
  return {
    icms: regras.icms || '',
    ipi: regras.ipi || '',
    pis: regras.pis || '',
    cofins: regras.cofins || '',
  };
};

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
      regras_tributacao: parseRegrasTributacao((categoria as any)?.regras_tributacao),
    },
  });

  React.useEffect(() => {
    if (categoria) {
      form.reset({
        nome: categoria.nome,
        descricao: categoria.descricao || '',
        regras_tributacao: parseRegrasTributacao((categoria as any).regras_tributacao),
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
        regras_tributacao: {},
      });
    }
  }, [categoria, form]);

  const handleSubmit = (data: FormData) => {
    console.log('[FormCategoria] Dados do formulário:', data);
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

            <div className="space-y-3">
              <FormLabel>Regras de Tributação Padrão</FormLabel>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="regras_tributacao.icms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ICMS (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regras_tributacao.ipi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IPI (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regras_tributacao.pis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIS (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="regras_tributacao.cofins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>COFINS (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
