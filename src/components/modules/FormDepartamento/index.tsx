
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
import { Departamento } from '@/types/rh';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { FormDepartamentoFields } from './FormDepartamentoFields';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome do departamento é obrigatório'),
  descricao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FormDepartamentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departamento?: Departamento | null;
  onSuccess?: () => void;
}

const FormDepartamento: React.FC<FormDepartamentoProps> = ({
  open,
  onOpenChange,
  departamento,
  onSuccess,
}) => {
  const { saveDepartamento, loading } = useDepartamentos();
  const { toast } = useToast();

  console.log('[Departamentos] FormDepartamento renderizado - Modo:', departamento ? 'Edição' : 'Criação');
  console.log('[Departamentos] Departamento recebido:', departamento);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      descricao: '',
    },
  });

  // Reset form when departamento changes or modal opens/closes
  React.useEffect(() => {
    console.log('[Departamentos] Effect disparado - open:', open, 'departamento:', departamento?.nome);
    
    if (open) {
      const formData: FormData = {
        nome: departamento?.nome || '',
        descricao: departamento?.descricao || '',
      };
      
      console.log('[Departamentos] Resetando formulário com dados:', formData);
      form.reset(formData);
    } else {
      // Limpa o formulário quando fecha
      console.log('[Departamentos] Limpando formulário ao fechar modal');
      form.reset({
        nome: '',
        descricao: '',
      });
    }
  }, [departamento, open, form]);

  const handleSubmit = async (data: FormData) => {
    console.log('[Departamentos] Dados do formulário submetidos:', data);
    
    const departamentoData: Departamento = {
      id: departamento?.id,
      nome: data.nome.trim(),
      descricao: data.descricao?.trim() || undefined,
      ativo: departamento?.ativo ?? true,
    };

    console.log('[Departamentos] Dados processados para envio:', departamentoData);

    try {
      const success = await saveDepartamento(departamentoData);
      
      if (success) {
        console.log('[Departamentos] Departamento salvo com sucesso, executando callbacks');
        onOpenChange(false);
        onSuccess?.();
      } else {
        console.log('[Departamentos] Falha ao salvar departamento');
      }
    } catch (error) {
      console.error('[Departamentos] Erro não tratado no handleSubmit:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao processar dados.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    console.log('[Departamentos] Modal fechado pelo usuário');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {departamento ? `Editar Departamento: ${departamento.nome}` : 'Novo Departamento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormDepartamentoFields form={form as any} loading={loading} />

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
                {departamento ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FormDepartamento;
