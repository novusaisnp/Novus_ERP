
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { VencimentoPadrao } from '@/types/rh';
import { useVencimentosPadrao } from '@/hooks/useVencimentosPadrao';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(10, 'Código deve ter no máximo 10 caracteres'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  tipo: z.enum(['FIXO', 'PERCENTUAL', 'HORAS'], {
    required_error: 'Tipo é obrigatório',
  }),
  valor: z.number().min(0, 'Valor deve ser positivo').optional(),
  percentual: z.number().min(0, 'Percentual deve ser positivo').max(100, 'Percentual deve ser no máximo 100').optional(),
  incideInss: z.boolean().default(true),
  incideIrrf: z.boolean().default(true),
  incideFgts: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface FormVencimentoPadraoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vencimento?: VencimentoPadrao | null;
  onSuccess?: () => void;
}

export const FormVencimentoPadrao: React.FC<FormVencimentoPadraoProps> = ({
  open,
  onOpenChange,
  vencimento,
  onSuccess
}) => {
  const { saveVencimento, loading } = useVencimentosPadrao();

  // Definir valores padrão seguros
  const defaultValues: FormData = {
    codigo: '',
    descricao: '',
    tipo: 'FIXO', // Sempre ter um valor válido
    valor: 0,
    percentual: 0,
    incideInss: true,
    incideIrrf: true,
    incideFgts: true,
    ativo: true,
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const watchTipo = form.watch('tipo');

  React.useEffect(() => {
    if (open) {
      if (vencimento) {
        console.log('[FormVencimentoPadrao] Preenchendo formulário com dados do vencimento:', vencimento);
        // Garantir que o tipo seja sempre válido
        const tipoValido = vencimento.tipo as 'FIXO' | 'PERCENTUAL' | 'HORAS' || 'FIXO';
        
        form.reset({
          codigo: vencimento.codigo || '',
          descricao: vencimento.descricao || '',
          tipo: tipoValido,
          valor: vencimento.valor || 0,
          percentual: vencimento.percentual || 0,
          incideInss: vencimento.incideInss ?? true,
          incideIrrf: vencimento.incideIrrf ?? true,
          incideFgts: vencimento.incideFgts ?? true,
          ativo: vencimento.ativo ?? true,
        });
      } else {
        console.log('[FormVencimentoPadrao] Limpando formulário para novo vencimento');
        form.reset(defaultValues);
      }
    }
  }, [vencimento, form, open]);

  const onSubmit = async (data: FormData) => {
    console.log('[FormVencimentoPadrao] Enviando dados do formulário:', data);

    const vencimentoData: VencimentoPadrao = {
      id: vencimento?.id,
      codigo: data.codigo,
      descricao: data.descricao,
      tipo: data.tipo,
      valor: data.tipo === 'FIXO' ? data.valor : undefined,
      percentual: data.tipo !== 'FIXO' ? data.percentual : undefined,
      incideInss: data.incideInss,
      incideIrrf: data.incideIrrf,
      incideFgts: data.incideFgts,
      ativo: data.ativo,
    };

    const success = await saveVencimento(vencimentoData);
    if (success) {
      console.log('[FormVencimentoPadrao] Vencimento salvo com sucesso');
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {vencimento ? 'Editar Vencimento Padrão' : 'Novo Vencimento Padrão'}
          </DialogTitle>
          <DialogDescription>
            {vencimento 
              ? 'Edite as informações do vencimento padrão.' 
              : 'Cadastre um novo vencimento padrão para a folha de pagamento.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: HE50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'FIXO'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIXO">Valor Fixo</SelectItem>
                        <SelectItem value="PERCENTUAL">Percentual</SelectItem>
                        <SelectItem value="HORAS">Por Horas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Hora Extra 50%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchTipo === 'FIXO' ? (
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="percentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        max="100"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Incidências</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="incideInss"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel className="text-sm">INSS</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incideIrrf"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel className="text-sm">IRRF</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incideFgts"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel className="text-sm">FGTS</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Ativo</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Salvando...' : (vencimento ? 'Atualizar' : 'Cadastrar')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
