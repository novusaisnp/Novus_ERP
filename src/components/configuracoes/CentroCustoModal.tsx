
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Building2, Hash, FileText, ToggleLeft } from 'lucide-react';
import type { CentroCusto, CentroCustoInput } from '@/types/configuracoes';

const centroCustoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo'),
  codigo: z.string().max(100, 'Código muito longo').optional(),
  descricao: z.string().optional(),
  ativo: z.boolean(),
});

interface CentroCustoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCusto?: CentroCusto;
  onSave: (data: CentroCustoInput) => Promise<CentroCusto | null>;
  loading?: boolean;
}

export const CentroCustoModal: React.FC<CentroCustoModalProps> = ({
  open,
  onOpenChange,
  centroCusto,
  onSave,
  loading = false,
}) => {
  const form = useForm<CentroCustoInput>({
    resolver: zodResolver(centroCustoSchema),
    defaultValues: {
      nome: '',
      codigo: '',
      descricao: '',
      ativo: true,
    },
  });

  const isEditing = !!centroCusto;

  useEffect(() => {
    if (centroCusto) {
      form.reset({
        nome: centroCusto.nome,
        codigo: centroCusto.codigo || '',
        descricao: centroCusto.descricao || '',
        ativo: centroCusto.ativo,
      });
    } else {
      form.reset({
        nome: '',
        codigo: '',
        descricao: '',
        ativo: true,
      });
    }
  }, [centroCusto, form]);

  const handleSubmit = async (data: CentroCustoInput) => {
    const result = await onSave(data);
    if (result) {
      onOpenChange(false);
      form.reset();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Nome do Centro de Custo *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Departamento Financeiro"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Código
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: DEPT-FIN"
                        {...field}
                        disabled={loading}
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
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Descrição
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição detalhada do centro de custo..."
                        rows={3}
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2 text-base">
                        <ToggleLeft className="w-4 h-4" />
                        Status
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? 'Centro de custo ativo' : 'Centro de custo inativo'}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !form.formState.isValid}
                className="flex-1 sm:flex-none"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
