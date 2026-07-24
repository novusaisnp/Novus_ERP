import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const formSchema = z.object({
  nomeCompleto: z.string().min(1, 'Nome completo é obrigatório'),
  email: z.string().email('E-mail inválido'),
});

type NovoUsuarioFormValues = z.infer<typeof formSchema>;

interface NovoUsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const NovoUsuarioModal: React.FC<NovoUsuarioModalProps> = ({ open, onOpenChange, onCreated }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<NovoUsuarioFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeCompleto: '',
      email: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (values: NovoUsuarioFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        email_confirm: true, // Confirma o e-mail automaticamente
        password: Math.random().toString(36).slice(-8), // Senha temporária aleatória
        user_metadata: { full_name: values.nomeCompleto },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Usuário não retornado após criação no Auth.');
      }

      const newAuthUserId = authData.user.id;

      // 2. Enviar e-mail de redefinição de senha para o novo usuário
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`, // Redireciona para a página de redefinição de senha do seu app
      });

      if (resetError) {
        // Se o envio do e-mail de redefinição falhar, ainda assim o usuário foi criado.
        // Podemos logar o erro, mas não necessariamente reverter a criação do usuário no Auth.
        console.error('Erro ao enviar e-mail de redefinição de senha:', resetError.message);
        toast({
          title: 'Atenção',
          description: `Usuário ${values.email} criado, mas houve um erro ao enviar o e-mail de redefinição de senha. Por favor, solicite a redefinição manualmente.`,
          variant: 'destructive',
          duration: 8000,
        });
      } else {
        toast({
          title: 'Sucesso',
          description: `Usuário ${values.email} criado. Um e-mail de redefinição de senha foi enviado.`,
        });
      }

      // 3. Criar registro na tabela public.usuarios
      const { error: userTableError } = await supabase.from('usuarios').insert({
        user_id: newAuthUserId,
        nome: values.nomeCompleto,
        email: values.email,
        ativo: true,
        empresa_representada_id: null, // Pode ser preenchido posteriormente ou via RLS
      });

      if (userTableError) {
        // Se falhar a inserção na tabela public.usuarios, tentar deletar o usuário do Auth para manter a consistência
        console.error('Erro ao inserir usuário na tabela public.usuarios:', userTableError.message);
        await supabase.auth.admin.deleteUser(newAuthUserId); // Tenta reverter a criação no Auth
        throw new Error(`Erro ao finalizar criação do usuário. O usuário no Auth foi revertido. Detalhes: ${userTableError.message}`);
      }

      form.reset();
      onOpenChange(false);
      onCreated(); // Notifica o componente pai para recarregar a lista
    } catch (error: any) {
      console.error('Erro completo na criação do usuário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar usuário. Verifique os logs.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie um novo usuário para o sistema. Um e-mail de redefinição de senha será enviado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nomeCompleto" className="text-right">
              Nome completo
            </Label>
            <Input
              id="nomeCompleto"
              {...form.register('nomeCompleto')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.nomeCompleto && (
              <p className="col-span-4 text-right text-sm text-red-500">{form.formState.errors.nomeCompleto.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.email && (
              <p className="col-span-4 text-right text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoUsuarioModal;