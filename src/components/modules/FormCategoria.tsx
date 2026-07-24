import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { PlanoContaCombobox } from '@/components/shared/PlanoContaCombobox';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import type { Categoria } from '@/services/categoriaService';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  descricao: z.string().optional(),
  ativo: z.boolean(),
  plano_conta_receita_id: z.string().uuid().nullable().optional(),
  centro_custo_id: z.string().uuid().nullable().optional(),
  plano_conta_despesa_id: z.string().uuid().nullable().optional(),
  centro_custo_despesa_id: z.string().uuid().nullable().optional(),
}).refine(
  (d) => !d.ativo || !!d.plano_conta_receita_id,
  { message: 'Obrigatório para categorias ativas', path: ['plano_conta_receita_id'] },
).refine(
  (d) => !d.ativo || !!d.plano_conta_despesa_id,
  { message: 'Obrigatório para categorias ativas', path: ['plano_conta_despesa_id'] },
);

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
  const { centrosCusto } = useCentrosCusto();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      descricao: '',
      ativo: true,
      plano_conta_receita_id: null,
      centro_custo_id: null,
      plano_conta_despesa_id: null,
      centro_custo_despesa_id: null,
    },
  });

  React.useEffect(() => {
    if (categoria) {
      form.reset({
        nome: categoria.nome,
        descricao: categoria.descricao || '',
        ativo: categoria.ativo ?? true,
        plano_conta_receita_id: categoria.plano_conta_receita_id ?? null,
        centro_custo_id: categoria.centro_custo_id ?? null,
        plano_conta_despesa_id: categoria.plano_conta_despesa_id ?? null,
        centro_custo_despesa_id: categoria.centro_custo_despesa_id ?? null,
      });
    } else {
      form.reset({
        nome: '',
        descricao: '',
        ativo: true,
        plano_conta_receita_id: null,
        centro_custo_id: null,
        plano_conta_despesa_id: null,
        centro_custo_despesa_id: null,
      });
    }
  }, [categoria, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{categoria ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          <DialogDescription>
            Categorias ativas exigem classificação contábil de receita e despesa. Todos os produtos vinculados a esta categoria herdam essa classificação.
          </DialogDescription>
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
                    <Input placeholder="Ex: Bebidas Não Alcoólicas" {...field} />
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
                    <Textarea placeholder="Descreva a categoria (opcional)" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="mb-0">Categoria ativa</FormLabel>
                    <FormDescription>
                      Desative para salvar como rascunho sem classificação contábil.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="rounded-md border p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Classificação Contábil — Receita</h4>
                <p className="text-xs text-muted-foreground">
                  Aplicada quando produtos desta categoria são vendidos.
                </p>
              </div>

              <FormField
                control={form.control}
                name="plano_conta_receita_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano de Contas de Receita {form.watch('ativo') && '*'}</FormLabel>
                    <FormControl>
                      <PlanoContaCombobox
                        tipo="RECEITA"
                        value={field.value ?? null}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="centro_custo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo (Receita)</FormLabel>
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {centrosCusto.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.codigo ? `${cc.codigo} — ` : ''}{cc.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold">Classificação Contábil — Despesa</h4>
                <p className="text-xs text-muted-foreground">
                  Aplicada quando produtos desta categoria são comprados.
                </p>
              </div>

              <FormField
                control={form.control}
                name="plano_conta_despesa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano de Contas de Despesa {form.watch('ativo') && '*'}</FormLabel>
                    <FormControl>
                      <PlanoContaCombobox
                        tipo="DESPESA"
                        value={field.value ?? null}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="centro_custo_despesa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Custo (Despesa)</FormLabel>
                    <Select
                      value={field.value ?? '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {centrosCusto.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.codigo ? `${cc.codigo} — ` : ''}{cc.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
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
