
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
import { DescontoPadrao } from '@/types/rh';
import { useDescontosPadrao } from '@/hooks/useDescontosPadrao';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { FormDescontoPadraoFields } from './FormDescontoPadraoFields';

const formSchema = z.object({
  codigo: z.string().min(1, 'Código é obrigatório').max(10, 'Código deve ter no máximo 10 caracteres'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  tipo: z.enum(['FIXO', 'PERCENTUAL', 'TABELA'], {
    required_error: 'Tipo é obrigatório',
  }),
  valor: z.string().optional(),
  percentual: z.string().optional(),
  tabelaProgressiva: z.any().optional(),
}).refine((data) => {
  if (data.tipo === 'FIXO' && !data.valor) {
    return false;
  }
  if (data.tipo === 'PERCENTUAL' && !data.percentual) {
    return false;
  }
  return true;
}, {
  message: 'Valor ou percentual é obrigatório conforme o tipo selecionado',
  path: ['valor']
});

type FormData = z.infer<typeof formSchema>;

interface FormDescontoPadraoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  desconto?: DescontoPadrao | null;
  onSuccess?: () => void;
}

export const FormDescontoPadrao: React.FC<FormDescontoPadraoProps> = ({
  open,
  onOpenChange,
  desconto,
  onSuccess,
}) => {
  const { saveDesconto } = useDescontosPadrao();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);

  console.log('[DescontosPadrao] FormDescontoPadrao renderizado - Modo:', desconto ? 'Edição' : 'Criação');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: '',
      descricao: '',
      tipo: 'FIXO',
      valor: '',
      percentual: '',
      tabelaProgressiva: undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      const formData: FormData = {
        codigo: desconto?.codigo || '',
        descricao: desconto?.descricao || '',
        tipo: desconto?.tipo || 'FIXO',
        valor: desconto?.valor?.toString() || '',
        percentual: desconto?.percentual?.toString() || '',
        tabelaProgressiva: desconto?.tabelaProgressiva || undefined,
      };
      
      console.log('[DescontosPadrao] Resetando formulário com dados:', formData);
      form.reset(formData);
    } else {
      form.reset({
        codigo: '',
        descricao: '',
        tipo: 'FIXO',
        valor: '',
        percentual: '',
        tabelaProgressiva: undefined,
      });
    }
  }, [desconto, open, form]);

  const handleSubmit = async (data: FormData) => {
    console.log('[DescontosPadrao] Enviando dados do formulário:', data);
    setLoading(true);
    
    try {
      const valorNum = data.valor ? parseFloat(data.valor.replace(/[^\d,.-]/g, '').replace(',', '.')) : undefined;
      const percentualNum = data.percentual ? parseFloat(data.percentual.replace('%', '')) : undefined;
      
      const descontoData: DescontoPadrao = {
        id: desconto?.id,
        codigo: data.codigo.toUpperCase().trim(),
        descricao: data.descricao.trim(),
        tipo: data.tipo,
        valor: valorNum,
        percentual: percentualNum,
        tabelaProgressiva: data.tabelaProgressiva,
        ativo: desconto?.ativo ?? true,
      };

      console.log('[DescontosPadrao] Dados processados para envio:', descontoData);

      const success = await saveDesconto(descontoData);
      
      if (success) {
        console.log('[DescontosPadrao] Desconto salvo com sucesso, executando callbacks');
        onOpenChange(false);
        onSuccess?.();
        
        toast({
          title: "Sucesso!",
          description: desconto?.id ? "Desconto atualizado com sucesso!" : "Desconto criado com sucesso!",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('[DescontosPadrao] Modal fechado pelo usuário');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {desconto ? `Editar Desconto: ${desconto.codigo}` : 'Novo Desconto Padrão'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormDescontoPadraoFields form={form as any} loading={loading} />

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
                {desconto ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
